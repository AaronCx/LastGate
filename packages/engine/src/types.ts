export type CheckStatus = "pass" | "warn" | "fail";
export type CheckType =
  | "secrets"
  | "duplicates"
  | "lint"
  | "build"
  | "dependencies"
  | "file_patterns"
  | "commit_message"
  | "agent_patterns"
  | "semantic";

export interface CheckResult {
  type: CheckType;
  status: CheckStatus;
  title: string;
  summary?: string;
  details: Record<string, unknown>;
  duration_ms?: number;
}

/**
 * Provenance for a check run: which engine + resolved config produced this
 * result. Stamped into every run so a stale deployment can't be misdiagnosed —
 * the output says exactly what judged it.
 */
export interface CheckRunMeta {
  /** Engine package version that ran the checks. */
  engineVersion: string;
  /** The entropy threshold actually applied (resolved config, not the default). */
  entropyThreshold: number;
  /** Whether this engine honors inline `lastgate-ignore` suppressions. */
  inlineIgnore: boolean;
  /** Versioned ruleset identifier, when rulesets are versioned. */
  rulesetVersion?: string;
}

export interface CheckRunResults {
  checks: CheckResult[];
  hasFailures: boolean;
  hasWarnings: boolean;
  failureCount: number;
  warningCount: number;
  summary: string;
  annotations: Annotation[];
  /** Engine + resolved-config provenance (see CheckRunMeta). */
  meta: CheckRunMeta;
}

export interface Annotation {
  path: string;
  start_line: number;
  end_line: number;
  annotation_level: "notice" | "warning" | "failure";
  message: string;
  title: string;
}

export interface AddedLine {
  lineNo: number;
  text: string;
}

export interface ChangedFile {
  path: string;
  /** Real post-change file content. Must NOT be set to the raw patch — that's the legacy bug. */
  content: string;
  /** Raw unified-diff patch, kept for reference and for fallback addedLines derivation. */
  patch?: string;
  /**
   * Real new-file line numbers of added lines. Derive via parseAddedLines(patch) at the producer
   * boundary (CLI / webhook). Optional for backward compat — checks fall back to deriving from
   * `patch`, or as a last resort scanning `content` as fully-added (correct for status=added).
   */
  addedLines?: AddedLine[];
  status: "added" | "modified" | "removed" | "renamed";
}

export type FindingSeverity = "critical" | "high" | "medium" | "low";

/**
 * Run profile selector.
 *  - `fast` — pre-commit / interactive loop. Skips heavy operations like full builds.
 *  - `full` — pre-push / CI. Runs everything including the build verifier.
 */
export type CheckProfile = "fast" | "full";

/**
 * Canonical finding shape for content-scanning checks. Existing checks may keep their bespoke
 * detail shapes for now; PR-2 will introduce statusFromFindings() that consumes this severity.
 */
export interface Finding {
  file: string;
  line: number;
  rule: string;
  message: string;
  severity: FindingSeverity;
  match?: string;
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  timestamp: string;
}

export interface PipelineConfig {
  checks: {
    secrets?: SecretCheckConfig;
    duplicates?: DuplicateCheckConfig;
    lint?: LintCheckConfig;
    build?: BuildCheckConfig;
    dependencies?: DependencyCheckConfig;
    file_patterns?: FilePatternCheckConfig;
    commit_message?: CommitMessageCheckConfig;
    agent_patterns?: AgentPatternCheckConfig;
    semantic?: SemanticCheckConfig;
  };
  /** Top-level path allowlist applied to every content-scanning check. */
  allow?: string[];
  /** Path to the baseline file holding accepted finding fingerprints. */
  baseline?: string;
  protected_branches?: string[];
  notifications?: {
    slack_webhook?: string;
    email?: string;
  };
  agent_feedback?: {
    format: "structured" | "human-readable" | "both";
  };
}

export interface SecretCheckConfig {
  enabled: boolean;
  severity: "fail" | "warn";
  /** Shannon entropy threshold for the entropy-only scanner. Default 4.8. */
  entropy_threshold?: number;
  /** Severity tier applied to entropy-only findings. Default "medium" — caps at warn. */
  entropy_severity?: FindingSeverity;
  /** Path globs to silence (in addition to the top-level `allow`). */
  allow?: string[];
  /** Override which run profile this check participates in. Default: "fast". */
  profile?: CheckProfile;
  custom_patterns?: Array<{
    name: string;
    pattern: string;
    severity?: "high" | "critical";
  }>;
}

/**
 * Optional runtime context handed to checks alongside their config. Carries cross-cutting state
 * (baseline fingerprints, merged allowlists) so checks don't have to re-load it themselves.
 */
export interface CheckContext {
  /** Pre-loaded fingerprints from `.lastgate-baseline.json`. */
  baseline?: Set<string>;
  /** Merged path allowlist (top-level + check-specific). */
  allow?: string[];
}

export interface DuplicateCheckConfig {
  enabled: boolean;
  severity: "fail" | "warn";
  lookback: number;
  profile?: CheckProfile;
}

export interface LintCheckConfig {
  enabled: boolean;
  severity: "fail" | "warn";
  command?: string;
  profile?: CheckProfile;
}

export interface BuildCheckConfig {
  enabled: boolean;
  severity: "fail" | "warn";
  command?: string;
  timeout?: number;
  /** Default profile is "full" — only runs in the pre-push / CI loop. */
  profile?: CheckProfile;
}

export interface DependencyCheckConfig {
  enabled: boolean;
  severity: "fail" | "warn";
  fail_on?: "critical" | "high" | "moderate" | "low";
  profile?: CheckProfile;
}

export interface FilePatternCheckConfig {
  enabled: boolean;
  severity: "fail" | "warn";
  block?: string[];
  allow?: string[];
  profile?: CheckProfile;
}

export interface CommitMessageCheckConfig {
  enabled: boolean;
  severity: "fail" | "warn";
  require_conventional: boolean;
  profile?: CheckProfile;
}

export interface AgentPatternCheckConfig {
  enabled: boolean;
  severity: "fail" | "warn";
  profile?: CheckProfile;
}

/**
 * Semantic review tier — the only check that runs an LLM. It reviews the *added* lines of a
 * diff against a per-repo policy prompt, catching intent-level regressions that regex can't:
 * silently swallowed errors, a weakened auth check, a migration that drops a column.
 *
 * Cost-bounded (token budget per run), cached by diff hash, and fails OPEN: if no model/API key
 * is configured or the LLM errors, the check passes with a skipped note. Findings default to
 * `warn` severity so false positives never hard-block a PR.
 */
export interface SemanticCheckConfig {
  /** Default false — opt-in so existing users are never surprised by LLM calls. */
  enabled: boolean;
  /** Default "warn". Even if set to "fail", statusFromFindings caps medium/low at warn. */
  severity: "fail" | "warn";
  /** Model identifier passed to the AI client (must exist in ai/cost MODEL_COSTS for accurate cost). */
  model?: string;
  /** Hard token budget per run (prompt + completion). Default 20000. */
  token_budget?: number;
  /** Per-repo policy prompt describing what to flag. Inlined into the system prompt. */
  policy?: string;
  /**
   * When true (default), the check short-circuits to "pass" unless every prior static tier passed —
   * the semantic tier only spends tokens on diffs that already cleared the cheap checks.
   */
  run_only_on_clean?: boolean;
  /** Override which run profile this check participates in. Default: "full". */
  profile?: CheckProfile;
}
