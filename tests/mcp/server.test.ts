import { describe, test, expect } from "bun:test";
import { validateApiKey } from "../../packages/mcp-server/src/auth";
import { formatPreCheckResult } from "../../packages/mcp-server/src/tools/pre-check";
import { formatStatusResult } from "../../packages/mcp-server/src/tools/status";
import { formatConfigResult } from "../../packages/mcp-server/src/tools/config";
import { formatHistoryResult, type HistoryRun } from "../../packages/mcp-server/src/tools/history";
import {
  PRE_CHECK_TOOL,
  STATUS_TOOL,
  CONFIG_TOOL,
  HISTORY_TOOL,
} from "../../packages/mcp-server/src/index";

// --- Auth Tests ---
describe("MCP Auth", () => {
  test("rejects missing API key", () => {
    const result = validateApiKey(undefined);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("required");
  });

  test("rejects invalid prefix", () => {
    const prefix = "sk_" + "live_";
    const result = validateApiKey(`${prefix}abcdefghijklmnopqrstuvwxyz`);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("format");
  });

  test("rejects short key", () => {
    const result = validateApiKey("lg_cli_short");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("short");
  });

  test("accepts valid lg_ key", () => {
    const result = validateApiKey("lg_abcdefghijklmnopqrstuvwxyz");
    expect(result.valid).toBe(true);
  });

  test("accepts valid lg_cli_ key", () => {
    const result = validateApiKey("lg_cli_abcdefghijklmnopqrstuvwxyz");
    expect(result.valid).toBe(true);
  });
});

// --- Tool Schema Tests ---
describe("MCP Tool Schemas", () => {
  test("pre-check tool has correct name and required fields", () => {
    expect(PRE_CHECK_TOOL.name).toBe("lastgate_pre_check");
    expect(PRE_CHECK_TOOL.inputSchema.required).toContain("files");
  });

  test("status tool requires repo", () => {
    expect(STATUS_TOOL.name).toBe("lastgate_status");
    expect(STATUS_TOOL.inputSchema.required).toContain("repo");
  });

  test("config tool requires repo", () => {
    expect(CONFIG_TOOL.name).toBe("lastgate_config");
    expect(CONFIG_TOOL.inputSchema.required).toContain("repo");
  });

  test("history tool requires repo", () => {
    expect(HISTORY_TOOL.name).toBe("lastgate_history");
    expect(HISTORY_TOOL.inputSchema.required).toContain("repo");
  });
});

// --- Pre-Check Formatting ---
describe("MCP Pre-Check Formatter", () => {
  test("all passing shows safe to commit", () => {
    const result = formatPreCheckResult([
      { type: "secrets", status: "pass", title: "No secrets found" },
      { type: "lint", status: "pass", title: "No lint issues" },
    ]);
    expect(result.content[0].text).toContain("Safe to commit");
  });

  test("failures show fix message", () => {
    const result = formatPreCheckResult([
      {
        type: "secrets",
        status: "fail",
        title: "API key detected",
        details: {
          findings: [{ file: "src/config.ts", line: 12, message: "Possible API key" }],
        },
      },
    ]);
    expect(result.content[0].text).toContain("FAIL");
    expect(result.content[0].text).toContain("src/config.ts:12");
    expect(result.content[0].text).toContain("Fix these issues");
  });

  test("warnings are listed", () => {
    const result = formatPreCheckResult([
      { type: "commit_message", status: "warn", title: "Generic commit message" },
    ]);
    expect(result.content[0].text).toContain("warning");
    expect(result.content[0].text).toContain("commit_message");
  });
});

// --- Status Formatting ---
describe("MCP Status Formatter", () => {
  test("no runs returns empty message", () => {
    const result = formatStatusResult("AaronCx/Test", []);
    expect(result.content[0].text).toContain("No recent check runs");
  });

  test("passing runs show pass rate", () => {
    const result = formatStatusResult("AaronCx/Test", [
      { status: "passed", commit_sha: "abc1234567890", created_at: "2026-01-01" },
      { status: "passed", commit_sha: "def4567890123", created_at: "2026-01-02" },
    ]);
    expect(result.content[0].text).toContain("100%");
    expect(result.content[0].text).toContain("✅");
  });

  test("mixed runs show failure count", () => {
    const result = formatStatusResult("AaronCx/Test", [
      { status: "failed", commit_sha: "abc1234567890", created_at: "2026-01-01" },
      { status: "passed", commit_sha: "def4567890123", created_at: "2026-01-02" },
    ]);
    expect(result.content[0].text).toContain("1 failed check");
    expect(result.content[0].text).toContain("❌");
  });
});

// --- Config Formatting ---
describe("MCP Config Formatter", () => {
  test("no config returns not found message", () => {
    const result = formatConfigResult("AaronCx/Test", null);
    expect(result.content[0].text).toContain("No .lastgate.yml");
  });

  test("config is formatted as yaml", () => {
    const result = formatConfigResult("AaronCx/Test", {
      checks: ["secrets", "lint", "build"],
      fail_on: "error",
    });
    expect(result.content[0].text).toContain("```yaml");
    expect(result.content[0].text).toContain("checks:");
    expect(result.content[0].text).toContain("- secrets");
    expect(result.content[0].text).toContain("fail_on: error");
  });

  test("nested config is formatted", () => {
    const result = formatConfigResult("AaronCx/Test", {
      notifications: { slack: true, discord: false },
    });
    expect(result.content[0].text).toContain("notifications:");
    expect(result.content[0].text).toContain("slack: true");
  });
});

// --- History Formatting ---
describe("MCP History Formatter", () => {
  test("no history returns empty message", () => {
    const result = formatHistoryResult("AaronCx/Test", []);
    expect(result.content[0].text).toContain("No check history");
  });

  test("runs are formatted with emoji and sha", () => {
    const runs: HistoryRun[] = [
      {
        id: "1",
        status: "passed",
        commit_sha: "abc1234567890",
        commit_message: "feat: add login",
        author: "AaronCx",
        checks_passed: 5,
        checks_failed: 0,
        created_at: "2026-01-15T10:30:00Z",
        duration_ms: 1230,
      },
    ];
    const result = formatHistoryResult("AaronCx/Test", runs);
    const text = result.content[0].text;
    expect(text).toContain("✅");
    expect(text).toContain("abc1234");
    expect(text).toContain("feat: add login");
    expect(text).toContain("AaronCx");
    expect(text).toContain("1.2s");
    expect(text).toContain("5 passed, 0 failed");
  });

  test("failed runs show red emoji", () => {
    const runs: HistoryRun[] = [
      {
        id: "2",
        status: "failed",
        commit_sha: "def4567890123",
        checks_passed: 3,
        checks_failed: 2,
        created_at: "2026-01-16T12:00:00Z",
      },
    ];
    const result = formatHistoryResult("AaronCx/Test", runs);
    expect(result.content[0].text).toContain("❌");
    expect(result.content[0].text).toContain("3 passed, 2 failed");
  });

  test("shows run count in header", () => {
    const runs: HistoryRun[] = [
      { id: "1", status: "passed", commit_sha: "aaa1111111111", checks_passed: 5, checks_failed: 0, created_at: "2026-01-15T10:30:00Z" },
      { id: "2", status: "failed", commit_sha: "bbb2222222222", checks_passed: 3, checks_failed: 2, created_at: "2026-01-14T10:30:00Z" },
    ];
    const result = formatHistoryResult("AaronCx/Test", runs);
    expect(result.content[0].text).toContain("2 runs");
  });
});
