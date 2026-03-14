import { describe, test, expect } from "bun:test";
import { STATUS_TOOL, formatStatusResult } from "../status";

describe("lastgate_status Tool", () => {
  test("tool requires repo", () => {
    expect(STATUS_TOOL.inputSchema.required).toContain("repo");
  });

  test("no runs returns not found message", () => {
    const result = formatStatusResult("AaronCx/Test", []);
    expect(result.content[0].text).toContain("No recent check runs");
  });

  test("passing runs show pass rate and green emoji", () => {
    const result = formatStatusResult("AaronCx/Test", [
      { status: "passed", commit_sha: "abc1234567890", created_at: "2026-01-01" },
      { status: "passed", commit_sha: "def4567890123", created_at: "2026-01-02" },
    ]);
    expect(result.content[0].text).toContain("100%");
    expect(result.content[0].text).toContain("✅");
  });

  test("failed runs show failure count and red emoji", () => {
    const result = formatStatusResult("AaronCx/Test", [
      { status: "failed", commit_sha: "abc1234567890", created_at: "2026-01-01" },
      { status: "passed", commit_sha: "def4567890123", created_at: "2026-01-02" },
    ]);
    expect(result.content[0].text).toContain("1 failed check");
    expect(result.content[0].text).toContain("❌");
  });

  test("repo name appears in header", () => {
    const result = formatStatusResult("AaronCx/AgentForge", [
      { status: "passed", commit_sha: "abc1234567890", created_at: "2026-01-01" },
    ]);
    expect(result.content[0].text).toContain("AaronCx/AgentForge");
  });

  test("commit SHA is truncated to 7 chars", () => {
    const result = formatStatusResult("AaronCx/Test", [
      { status: "passed", commit_sha: "abc1234567890", created_at: "2026-01-01" },
    ]);
    expect(result.content[0].text).toContain("abc1234");
  });
});
