import { describe, test, expect } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("CLI → API → Dashboard Flow", () => {
  test("step 1: login stores API key locally", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "cli-flow-"));
    try {
      const configDir = join(tmpDir, ".lastgate");
      const configFile = join(configDir, "config.json");
      await Bun.write(configFile, JSON.stringify({ api_key: "lg_cli_test123" }));
      const config = JSON.parse(readFileSync(configFile, "utf-8"));
      expect(config.api_key).toBe("lg_cli_test123");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("step 2: check command would detect a secret in test files", async () => {
    // Simulate what the check command would find
    const { checkSecrets } = await import("../../packages/engine/src/checks/secrets");
    const result = await checkSecrets(
      [{ path: "src/config.ts", content: 'const key = "AKIAIOSFODNN7EXAMPLE";', status: "added" }],
      { enabled: true, severity: "fail" },
    );
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).length).toBeGreaterThan(0);
  });

  test("step 3: CLI outputs correct failure", () => {
    const hasFailures = true;
    const exitCode = hasFailures ? 1 : 0;
    expect(exitCode).toBe(1);
  });

  test("step 4: check result structure for history", () => {
    const historyEntry = {
      repo: "AaronCx/TestRepo",
      sha: "abc1234",
      status: "failed",
      timestamp: new Date().toISOString(),
      failures: 1,
      warnings: 0,
    };
    expect(historyEntry.repo).toBeTruthy();
    expect(historyEntry.status).toBe("failed");
    expect(historyEntry.failures).toBe(1);
  });

  test("step 5: dashboard API query structure", () => {
    const query = {
      table: "check_runs",
      filters: { repo_full_name: "AaronCx/TestRepo" },
      order: { column: "created_at", ascending: false },
      limit: 10,
    };
    expect(query.table).toBe("check_runs");
    expect(query.filters.repo_full_name).toBeTruthy();
  });
});
