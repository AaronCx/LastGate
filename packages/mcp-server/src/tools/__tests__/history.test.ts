import { describe, test, expect } from "bun:test";
import { HISTORY_TOOL, formatHistoryResult, type HistoryRun } from "../history";

describe("lastgate_history Tool", () => {
  test("tool requires repo", () => {
    expect(HISTORY_TOOL.inputSchema.required).toContain("repo");
  });

  test("no history returns empty message", () => {
    const result = formatHistoryResult("AaronCx/Test", []);
    expect(result.content[0].text).toContain("No check history");
  });

  test("runs are formatted with emoji, sha, and date", () => {
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

  test("runs without commit message don't show undefined", () => {
    const runs: HistoryRun[] = [
      { id: "1", status: "passed", commit_sha: "abc1234567890", checks_passed: 5, checks_failed: 0, created_at: "2026-01-15T10:30:00Z" },
    ];
    const result = formatHistoryResult("AaronCx/Test", runs);
    expect(result.content[0].text).not.toContain("undefined");
  });

  test("runs without duration don't show duration format", () => {
    const runs: HistoryRun[] = [
      { id: "1", status: "passed", commit_sha: "abc1234567890", checks_passed: 5, checks_failed: 0, created_at: "2026-01-15T10:30:00Z" },
    ];
    const result = formatHistoryResult("AaronCx/Test", runs);
    // No "(X.Xs)" pattern when duration_ms is undefined
    expect(result.content[0].text).not.toMatch(/\(\d+\.\d+s\)/);
  });
});
