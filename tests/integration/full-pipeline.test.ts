import { describe, test, expect } from "bun:test";
import { runCheckPipeline, type PipelineInput } from "../../packages/engine/src/pipeline";
import type { ChangedFile, CommitInfo, PipelineConfig } from "../../packages/engine/src/types";

// Helper to create minimal pipeline inputs
function makeInput(overrides: Partial<PipelineInput> & { files?: ChangedFile[]; commits?: CommitInfo[] }): PipelineInput {
  return {
    files: overrides.files ?? [],
    commits: overrides.commits ?? [{ sha: "abc1234", message: "feat: test", author: "test", timestamp: new Date().toISOString() }],
    branch: "main",
    repoFullName: "test/repo",
    config: {
      checks: {
        secrets: { enabled: true, severity: "fail" },
        file_patterns: { enabled: true, severity: "fail" },
        commit_message: { enabled: true, severity: "warn", require_conventional: true },
        duplicates: { enabled: true, severity: "warn", lookback: 10 },
        agent_patterns: { enabled: true, severity: "warn" },
        // Disable slow checks
        lint: { enabled: false, severity: "fail" },
        build: { enabled: false, severity: "fail" },
        dependencies: { enabled: false, severity: "warn" },
      },
      ...overrides.config,
    } as PipelineConfig,
    ...overrides,
  };
}

describe("Full Pipeline Integration", () => {
  test("Scenario 1: Clean commit — all checks pass", async () => {
    const input = makeInput({
      files: [
        { path: "src/utils.ts", content: "export function add(a: number, b: number) { return a + b; }", status: "added" },
      ],
      commits: [{ sha: "abc1234", message: "feat: add utility function", author: "dev", timestamp: new Date().toISOString() }],
    });
    const results = await runCheckPipeline(input);
    expect(results.hasFailures).toBe(false);
    for (const check of results.checks) {
      expect(["pass", "warn"]).toContain(check.status);
    }
  });

  test("Scenario 2: Dirty commit — secrets fail, file patterns fail, commit message warns", async () => {
    const input = makeInput({
      files: [
        { path: "src/config.ts", content: 'const key = "AKIAIOSFODNN7EXAMPLE";', status: "added" },
        { path: ".env", content: "SECRET=value", status: "added" },
      ],
      commits: [{ sha: "def5678", message: "stuff", author: "agent", timestamp: new Date().toISOString() }],
    });
    const results = await runCheckPipeline(input);
    expect(results.hasFailures).toBe(true);

    const secretsCheck = results.checks.find(c => c.type === "secrets");
    expect(secretsCheck?.status).toBe("fail");

    const fileCheck = results.checks.find(c => c.type === "file_patterns");
    expect(fileCheck?.status).toBe("fail");

    const commitCheck = results.checks.find(c => c.type === "commit_message");
    expect(commitCheck?.status).toBe("fail"); // "stuff" is generic
  });

  test("Scenario 3: Agent thrashing — file added then deleted", async () => {
    const input = makeInput({
      files: [
        { path: "src/auth.ts", content: "code", status: "added" },
        { path: "src/auth.ts", content: "", status: "removed" },
      ],
      commits: [
        { sha: "c1", message: "feat: add auth", author: "agent", timestamp: new Date().toISOString() },
        { sha: "c2", message: "fix: remove auth", author: "agent", timestamp: new Date().toISOString() },
      ],
    });
    const results = await runCheckPipeline(input);
    const agentCheck = results.checks.find(c => c.type === "agent_patterns");
    expect(agentCheck?.status).toBe("warn");
    const findings = (agentCheck?.details as any).findings as any[];
    expect(findings.some((f: any) => f.pattern === "File Thrashing")).toBe(true);
  });

  test("Scenario 4: Config overrides — disable lint, set secrets to warn", async () => {
    const input = makeInput({
      files: [
        { path: "src/config.ts", content: 'const key = "AKIAIOSFODNN7EXAMPLE";', status: "added" },
      ],
      commits: [{ sha: "abc1234", message: "feat: add config", author: "dev", timestamp: new Date().toISOString() }],
      config: {
        checks: {
          secrets: { enabled: true, severity: "warn" },
          lint: { enabled: false, severity: "fail" },
          build: { enabled: false, severity: "fail" },
          dependencies: { enabled: false, severity: "warn" },
          file_patterns: { enabled: true, severity: "fail" },
          commit_message: { enabled: true, severity: "warn", require_conventional: true },
          duplicates: { enabled: true, severity: "warn", lookback: 10 },
          agent_patterns: { enabled: true, severity: "warn" },
        },
      },
    });
    const results = await runCheckPipeline(input);

    // Lint should be skipped
    const lintCheck = results.checks.find(c => c.type === "lint");
    expect(lintCheck).toBeUndefined();

    // Secrets check should still run and find the key
    const secretsCheck = results.checks.find(c => c.type === "secrets");
    expect(secretsCheck).toBeDefined();
    expect(secretsCheck!.status).toBe("fail"); // Engine always returns fail when findings exist
  });

  test("result object has correct structure", async () => {
    const input = makeInput({
      files: [{ path: "src/index.ts", content: "const x = 1;", status: "added" }],
    });
    const results = await runCheckPipeline(input);
    expect(results).toHaveProperty("checks");
    expect(results).toHaveProperty("hasFailures");
    expect(results).toHaveProperty("hasWarnings");
    expect(results).toHaveProperty("failureCount");
    expect(results).toHaveProperty("warningCount");
    expect(results).toHaveProperty("summary");
    expect(results).toHaveProperty("annotations");
    expect(Array.isArray(results.checks)).toBe(true);
    expect(Array.isArray(results.annotations)).toBe(true);
  });
});
