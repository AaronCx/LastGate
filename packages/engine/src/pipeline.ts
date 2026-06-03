import type {
  CheckContext,
  CheckProfile,
  CheckResult,
  CheckRunMeta,
  CheckRunResults,
  ChangedFile,
  CommitInfo,
  PipelineConfig,
  Annotation,
} from "./types";
import { ENGINE_VERSION } from "./version";
import { checkSecrets } from "./checks/secrets";

// Mirrors the secrets check's default (kept local so resolveMeta doesn't have to
// import from the secrets module). The secrets check remains the authority for
// applying it; this is only for reporting the resolved value in meta.
const DEFAULT_ENTROPY_THRESHOLD = 4.8;
import { checkDuplicates } from "./checks/duplicates";
import { checkLint } from "./checks/lint";
import { checkBuild } from "./checks/build";
import { checkDependencies } from "./checks/dependencies";
import { checkFilePatterns } from "./checks/file-patterns";
import { checkCommitMessage } from "./checks/commit-message";
import { checkAgentPatterns } from "./checks/agent-patterns";
import { getDefaultConfig } from "./config/defaults";
import { DEFAULT_BASELINE_PATH, loadBaseline } from "./config/allowlist";

export interface PipelineInput {
  files: ChangedFile[];
  commits: CommitInfo[];
  branch: string;
  repoFullName: string;
  config?: Partial<PipelineConfig>;
  previousCommits?: CommitInfo[];
}

export interface PipelineOptions {
  /**
   * Run profile.
   *  - "fast" (default) — pre-commit / interactive loop. Skips checks whose default or
   *    configured profile is "full" (the build verifier).
   *  - "full" — pre-push / CI. Runs every enabled check.
   */
  profile?: CheckProfile;
}

/** Default profile per check key. `build` is `full` only; everything else runs in `fast`. */
const DEFAULT_PROFILE_BY_CHECK: Record<keyof PipelineConfig["checks"], CheckProfile> = {
  secrets: "fast",
  file_patterns: "fast",
  commit_message: "fast",
  duplicates: "fast",
  lint: "fast",
  build: "full",
  dependencies: "fast",
  agent_patterns: "fast",
};

function checkRunsInProfile(
  checkKey: keyof PipelineConfig["checks"],
  configProfile: CheckProfile | undefined,
  runProfile: CheckProfile,
): boolean {
  const effective: CheckProfile = configProfile ?? DEFAULT_PROFILE_BY_CHECK[checkKey];
  // A "fast" check always runs in "full". A "full" check only runs in "full".
  if (runProfile === "full") return true;
  return effective === "fast";
}

interface CheckEntry {
  key: keyof PipelineConfig["checks"];
  fn: () => Promise<CheckResult>;
}

/**
 * Set up the cheap → expensive list of enabled-and-in-profile checks plus a runner that times +
 * crash-traps each call. Returns the entries the iterable and the batch runner share.
 */
async function buildCheckEntries(
  input: PipelineInput,
  opts: PipelineOptions,
): Promise<{
  entries: CheckEntry[];
  runEntry: (entry: CheckEntry) => Promise<CheckResult>;
}> {
  const runProfile: CheckProfile = opts.profile ?? "fast";
  const config = { ...getDefaultConfig(), ...input.config };

  const baselinePath = config.baseline ?? DEFAULT_BASELINE_PATH;
  const baseline = await loadBaseline(baselinePath);
  const sharedContext: CheckContext = { baseline, allow: config.allow };

  const all: CheckEntry[] = [
    { key: "secrets", fn: () => checkSecrets(input.files, config.checks.secrets!, sharedContext) },
    { key: "file_patterns", fn: () => checkFilePatterns(input.files, config.checks.file_patterns!) },
    { key: "commit_message", fn: () => checkCommitMessage(input.commits, config.checks.commit_message!) },
    { key: "agent_patterns", fn: () => checkAgentPatterns(input.commits, input.files, input.previousCommits || [], config.checks.agent_patterns!) },
    { key: "duplicates", fn: () => checkDuplicates(input.commits, input.previousCommits || [], config.checks.duplicates!) },
    { key: "lint", fn: () => checkLint(input.files, config.checks.lint!) },
    { key: "dependencies", fn: () => checkDependencies(input.files, config.checks.dependencies!) },
    { key: "build", fn: () => checkBuild(config.checks.build!, input.repoFullName) },
  ];

  const entries = all.filter((entry) => {
    const checkConfig = config.checks[entry.key];
    if (!checkConfig || !checkConfig.enabled) return false;
    return checkRunsInProfile(entry.key, checkConfig.profile, runProfile);
  });

  const runEntry = async (entry: CheckEntry): Promise<CheckResult> => {
    const start = performance.now();
    try {
      const result = await entry.fn();
      result.duration_ms = Math.round(performance.now() - start);
      return result;
    } catch (error) {
      return {
        type: entry.key as CheckResult["type"],
        status: "fail",
        title: `Check "${entry.key}" crashed`,
        summary: error instanceof Error ? error.message : String(error),
        details: { error: String(error) },
        duration_ms: Math.round(performance.now() - start),
      };
    }
  };

  return { entries, runEntry };
}

/**
 * Stream check results one at a time, in cheap → expensive order. Used by `lastgate step`.
 * Consumers can pause after each yielded result (e.g. to prompt the user) before the next check fires.
 */
export async function* runChecksIterable(
  input: PipelineInput,
  opts: PipelineOptions = {},
): AsyncGenerator<CheckResult> {
  const { entries, runEntry } = await buildCheckEntries(input, opts);
  for (const entry of entries) {
    yield await runEntry(entry);
  }
}

/**
 * Re-run a single check by key against current state. Used by the stepper to re-check after
 * a fix has been applied or a baseline entry added.
 */
export async function runSingleCheck(
  input: PipelineInput,
  opts: PipelineOptions,
  key: keyof PipelineConfig["checks"],
): Promise<CheckResult | undefined> {
  const { entries, runEntry } = await buildCheckEntries(input, opts);
  const entry = entries.find((e) => e.key === key);
  if (!entry) return undefined;
  return runEntry(entry);
}

/** Resolve the run's provenance metadata from the merged config. */
export function resolveMeta(config: Partial<PipelineConfig> | undefined): CheckRunMeta {
  const merged = { ...getDefaultConfig(), ...config };
  return {
    engineVersion: ENGINE_VERSION,
    entropyThreshold: merged.checks.secrets?.entropy_threshold ?? DEFAULT_ENTROPY_THRESHOLD,
    inlineIgnore: true,
  };
}

/** One-line provenance footer, e.g. `engine v0.3.0 · entropy 4.8 · inline-ignore on`. */
export function formatMetaFooter(meta: CheckRunMeta): string {
  const parts = [
    `engine v${meta.engineVersion}`,
    `entropy ${meta.entropyThreshold}`,
    `inline-ignore ${meta.inlineIgnore ? "on" : "off"}`,
  ];
  if (meta.rulesetVersion) parts.push(`ruleset ${meta.rulesetVersion}`);
  return parts.join(" · ");
}

export async function runCheckPipeline(
  input: PipelineInput,
  opts: PipelineOptions = {},
): Promise<CheckRunResults> {
  const runProfile: CheckProfile = opts.profile ?? "fast";
  void runProfile;
  const results: CheckResult[] = [];
  for await (const r of runChecksIterable(input, opts)) {
    results.push(r);
  }

  const failures = results.filter((r) => r.status === "fail");
  const warnings = results.filter((r) => r.status === "warn");
  const annotations = buildAnnotations(results);

  const meta = resolveMeta(input.config);
  const summary = buildSummary(results, meta);

  return {
    checks: results,
    hasFailures: failures.length > 0,
    hasWarnings: warnings.length > 0,
    failureCount: failures.length,
    warningCount: warnings.length,
    summary,
    annotations,
    meta,
  };
}

function buildAnnotations(results: CheckResult[]): Annotation[] {
  const annotations: Annotation[] = [];

  for (const result of results) {
    const findings = (result.details.findings as Array<Record<string, unknown>>) || [];
    for (const finding of findings) {
      if (finding.file && finding.line) {
        annotations.push({
          path: finding.file as string,
          start_line: finding.line as number,
          end_line: finding.line as number,
          annotation_level:
            result.status === "fail" ? "failure" : "warning",
          message: (finding.message as string) || (finding.pattern as string) || result.title,
          title: `${result.type}: ${(finding.pattern as string) || result.title}`,
        });
      }
    }
  }

  return annotations;
}

function buildSummary(results: CheckResult[], meta?: CheckRunMeta): string {
  const lines: string[] = [];
  lines.push("## LastGate Check Results\n");

  for (const result of results) {
    const icon =
      result.status === "pass" ? "✅" : result.status === "warn" ? "⚠️" : "❌";
    const duration = result.duration_ms ? ` (${result.duration_ms}ms)` : "";
    lines.push(`${icon} **${result.type}**: ${result.title}${duration}`);

    if (result.summary) {
      lines.push(`   ${result.summary}`);
    }
  }

  const failures = results.filter((r) => r.status === "fail").length;
  const warnings = results.filter((r) => r.status === "warn").length;
  const passes = results.filter((r) => r.status === "pass").length;

  lines.push("");
  lines.push(`---`);
  lines.push(
    `**${passes} passed**, **${warnings} warnings**, **${failures} failures**`
  );

  // Provenance footer — so a PR author sees which engine + threshold judged them.
  if (meta) {
    lines.push("");
    lines.push(`_${formatMetaFooter(meta)}_`);
  }

  return lines.join("\n");
}
