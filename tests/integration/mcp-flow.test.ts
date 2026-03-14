import { describe, test, expect } from "bun:test";
import { formatPreCheckResult } from "../../packages/mcp-server/src/tools/pre-check";
import { formatStatusResult } from "../../packages/mcp-server/src/tools/status";
import { formatConfigResult } from "../../packages/mcp-server/src/tools/config";
import { formatHistoryResult, type HistoryRun } from "../../packages/mcp-server/src/tools/history";
import { validateApiKey } from "../../packages/mcp-server/src/auth";

describe("MCP Integration Flow", () => {
  test("full agent workflow: config → pre-check fail → fix → pre-check pass → status → history", () => {
    // 1. Validate API key
    const authResult = validateApiKey("lg_cli_abcdefghijklmnopqrstuvwxyz");
    expect(authResult.valid).toBe(true);

    // 2. Get config
    const configResult = formatConfigResult("AaronCx/AgentForge", {
      checks: ["secrets", "lint", "build"],
    });
    expect(configResult.content[0].text).toContain("checks:");

    // 3. Pre-check with failure
    const failResult = formatPreCheckResult([
      {
        type: "secrets",
        status: "fail",
        title: "API key detected",
        details: {
          findings: [{ file: "src/config.ts", line: 5, message: "Possible API key" }],
        },
      },
    ]);
    expect(failResult.content[0].text).toContain("FAIL");
    expect(failResult.content[0].text).toContain("src/config.ts:5");

    // 4. Agent fixes the secret — pre-check again with clean files
    const passResult = formatPreCheckResult([
      { type: "secrets", status: "pass", title: "No secrets found" },
      { type: "lint", status: "pass", title: "No lint issues" },
    ]);
    expect(passResult.content[0].text).toContain("Safe to commit");

    // 5. Check status
    const statusResult = formatStatusResult("AaronCx/AgentForge", [
      { status: "passed", commit_sha: "abc1234567890", created_at: "2026-01-15" },
    ]);
    expect(statusResult.content[0].text).toContain("100%");

    // 6. Check history
    const historyRuns: HistoryRun[] = [
      {
        id: "1",
        status: "passed",
        commit_sha: "abc1234567890",
        commit_message: "fix: move API key to env",
        author: "claude",
        checks_passed: 3,
        checks_failed: 0,
        created_at: "2026-01-15T10:30:00Z",
        duration_ms: 850,
      },
    ];
    const historyResult = formatHistoryResult("AaronCx/AgentForge", historyRuns);
    expect(historyResult.content[0].text).toContain("fix: move API key to env");
  });
});
