import type {
  CheckContext,
  CheckProfile,
  CheckResult,
  CheckRunResults,
  ChangedFile,
  CommitInfo,
  PipelineConfig,
  Annotation,
} from "./types";
import { checkSecrets } from "./checks/secrets";
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

export async function runCheckPipeline(
  input: PipelineInput,
  opts: PipelineOptions = {},
): Promise<CheckRunResults> {
  const runProfile: CheckProfile = opts.profile ?? "fast";
  const config = { ...getDefaultConfig(), ...input.config };
  const results: CheckResult[] = [];

  // PR-3: load baseline fingerprints once and pass to every content-scanning check.
  const baselinePath = config.baseline ?? DEFAULT_BASELINE_PATH;
  const baseline = await loadBaseline(baselinePath);
  const sharedContext: CheckContext = {
    baseline,
    allow: config.allow,
  };

  // PR-4: order checks cheap → expensive so the early ones surface fast in a stepper loop later.
  const checks: Array<{
    key: keyof PipelineConfig["checks"];
    fn: () => Promise<CheckResult>;
  }> = [
    {
      key: "secrets",
      fn: () => checkSecrets(input.files, config.checks.secrets!, sharedContext),
    },
    {
      key: "file_patterns",
      fn: () => checkFilePatterns(input.files, config.checks.file_patterns!),
    },
    {
      key: "commit_message",
      fn: () =>
        checkCommitMessage(input.commits, config.checks.commit_message!),
    },
    {
      key: "agent_patterns",
      fn: () =>
        checkAgentPatterns(
          input.commits,
          input.files,
          input.previousCommits || [],
          config.checks.agent_patterns!
        ),
    },
    {
      key: "duplicates",
      fn: () =>
        checkDuplicates(
          input.commits,
          input.previousCommits || [],
          config.checks.duplicates!
        ),
    },
    {
      key: "lint",
      fn: () => checkLint(input.files, config.checks.lint!),
    },
    {
      key: "dependencies",
      fn: () => checkDependencies(input.files, config.checks.dependencies!),
    },
    {
      key: "build",
      fn: () => checkBuild(config.checks.build!, input.repoFullName),
    },
  ];

  for (const check of checks) {
    const checkConfig = config.checks[check.key];
    if (!checkConfig || !checkConfig.enabled) continue;
    if (!checkRunsInProfile(check.key, checkConfig.profile, runProfile)) continue;

    const start = performance.now();
    try {
      const result = await check.fn();
      result.duration_ms = Math.round(performance.now() - start);
      results.push(result);
    } catch (error) {
      results.push({
        type: check.key as CheckResult["type"],
        status: "fail",
        title: `Check "${check.key}" crashed`,
        summary: error instanceof Error ? error.message : String(error),
        details: { error: String(error) },
        duration_ms: Math.round(performance.now() - start),
      });
    }
  }

  const failures = results.filter((r) => r.status === "fail");
  const warnings = results.filter((r) => r.status === "warn");
  const annotations = buildAnnotations(results);

  const summary = buildSummary(results);

  return {
    checks: results,
    hasFailures: failures.length > 0,
    hasWarnings: warnings.length > 0,
    failureCount: failures.length,
    warningCount: warnings.length,
    summary,
    annotations,
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

function buildSummary(results: CheckResult[]): string {
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

  return lines.join("\n");
}
