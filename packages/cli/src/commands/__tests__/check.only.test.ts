import { describe, test, expect } from "bun:test";
import { getDefaultConfig, runCheckPipeline } from "@lastgate/engine";
import type { PipelineConfig } from "@lastgate/engine";

/**
 * Regression tests for Finding F2 (docs/fp-investigation.md):
 *
 * `lastgate check --only secrets` used to rebuild input.config.checks[key]
 * from scratch as `{ enabled: true }`, dropping the default `severity: "fail"`.
 * The pipeline's shallow merge then replaced the entire defaults sub-object,
 * so `statusFromFindings({ severity: undefined })` downgraded every critical
 * finding to `warn`. Same diff, same finding, different exit code.
 *
 * Fix: the `--only` branch now seeds each entry from `getDefaultConfig()` and
 * only overrides `enabled`. These tests guard against the regression by
 * replicating the CLI's filter logic directly (no shell, no subprocess) and
 * asserting the pipeline result honours the default severity.
 */

const AWS_KEY_FILE = {
  path: "danger.js",
  content: `const k = "AKIAIOSFODNN7EXAMPLE";\n`,
  status: "added" as const,
};
const COMMITS = [
  { sha: "abc1234", message: "feat: x", author: "t", timestamp: new Date().toISOString() },
];

const ALL_CHECK_KEYS = [
  "secrets",
  "file_patterns",
  "commit_message",
  "duplicates",
  "lint",
  "build",
  "dependencies",
  "agent_patterns",
] as const;

/** Pure replica of the CLI's --only filter logic, post-F2 fix. */
function applyOnlyFilter(input: { config?: PipelineConfig }, only: string): void {
  const allowedChecks = new Set(only.split(",").map((s) => s.trim()));
  const defaultChecks = getDefaultConfig().checks;
  if (!input.config) input.config = { checks: {} };
  if (!input.config.checks) input.config.checks = {} as PipelineConfig["checks"];
  const checks = input.config.checks as Record<string, Record<string, unknown>>;
  for (const key of ALL_CHECK_KEYS) {
    const merged = {
      ...(defaultChecks[key] ?? {}),
      ...(checks[key] ?? {}),
    };
    merged.enabled = allowedChecks.has(key);
    checks[key] = merged;
  }
}

describe("F2 — `--only` filter preserves default severity", () => {
  test("--only secrets still reports `fail` on a real AWS key (not downgraded to warn)", async () => {
    const input: { files: typeof AWS_KEY_FILE[]; commits: typeof COMMITS; branch: string; repoFullName: string; config?: PipelineConfig } = {
      files: [AWS_KEY_FILE],
      commits: COMMITS,
      branch: "HEAD",
      repoFullName: "t/t",
    };
    applyOnlyFilter(input, "secrets");

    const result = await runCheckPipeline(input);
    const secrets = result.checks.find((c) => c.type === "secrets");
    expect(secrets).toBeDefined();
    expect(secrets!.status).toBe("fail");
  });

  test("--only secrets does not run other checks", async () => {
    const input: { files: typeof AWS_KEY_FILE[]; commits: typeof COMMITS; branch: string; repoFullName: string; config?: PipelineConfig } = {
      files: [AWS_KEY_FILE],
      commits: COMMITS,
      branch: "HEAD",
      repoFullName: "t/t",
    };
    applyOnlyFilter(input, "secrets");

    const result = await runCheckPipeline(input);
    // Only the secrets check should run; everything else is disabled.
    expect(result.checks.map((c) => c.type)).toEqual(["secrets"]);
  });

  test("--only honours a per-check severity override from YAML (warn stays warn)", async () => {
    const input: { files: typeof AWS_KEY_FILE[]; commits: typeof COMMITS; branch: string; repoFullName: string; config?: PipelineConfig } = {
      files: [AWS_KEY_FILE],
      commits: COMMITS,
      branch: "HEAD",
      repoFullName: "t/t",
      config: {
        checks: {
          secrets: { enabled: true, severity: "warn" },
        },
      } as PipelineConfig,
    };
    applyOnlyFilter(input, "secrets");

    const result = await runCheckPipeline(input);
    const secrets = result.checks.find((c) => c.type === "secrets");
    expect(secrets!.status).toBe("warn");
  });

  test("--only secrets,commit_message enables both, disables the rest", async () => {
    const input: { files: typeof AWS_KEY_FILE[]; commits: typeof COMMITS; branch: string; repoFullName: string; config?: PipelineConfig } = {
      files: [AWS_KEY_FILE],
      commits: COMMITS,
      branch: "HEAD",
      repoFullName: "t/t",
    };
    applyOnlyFilter(input, "secrets,commit_message");

    const result = await runCheckPipeline(input);
    const types = result.checks.map((c) => c.type).sort();
    expect(types).toEqual(["commit_message", "secrets"]);
  });

  test("--only preserves default entropy_threshold and other secrets fields", async () => {
    // Sanity: the filter merge keeps every default field, not just severity.
    const input: { files: typeof AWS_KEY_FILE[]; commits: typeof COMMITS; branch: string; repoFullName: string; config?: PipelineConfig } = {
      files: [AWS_KEY_FILE],
      commits: COMMITS,
      branch: "HEAD",
      repoFullName: "t/t",
    };
    applyOnlyFilter(input, "secrets");
    const checks = (input.config!.checks as Record<string, Record<string, unknown>>);
    const defaultSecrets = getDefaultConfig().checks.secrets!;
    for (const key of Object.keys(defaultSecrets)) {
      if (key === "enabled") continue; // explicitly set by the filter
      expect(checks.secrets[key]).toEqual((defaultSecrets as Record<string, unknown>)[key]);
    }
  });
});
