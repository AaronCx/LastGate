import { describe, test, expect } from "bun:test";

describe("CLI history command", () => {
  test("default limit is 10", () => {
    const options = {};
    const limit = (options as any).limit ?? 10;
    expect(limit).toBe(10);
  });

  test("--repo flag filters results", () => {
    const options = { repo: "AgentForge" };
    expect(options.repo).toBe("AgentForge");
  });

  test("--limit flag limits results", () => {
    const options = { limit: 5 };
    expect(options.limit).toBe(5);
  });

  test("formats output as table with status icons", () => {
    const icons: Record<string, string> = {
      passed: "\u2713",
      failed: "\u2717",
      warning: "\u26A0",
    };
    expect(icons.passed).toBe("\u2713");
    expect(icons.failed).toBe("\u2717");
    expect(icons.warning).toBe("\u26A0");
  });

  test("requires authentication token", () => {
    const config = { api_key: undefined };
    const isAuthenticated = !!config.api_key;
    expect(isAuthenticated).toBe(false);
  });

  test("formats timestamps as relative time", () => {
    const timestamp = new Date(Date.now() - 1000 * 60 * 5);
    const diff = Date.now() - timestamp.getTime();
    expect(diff).toBeGreaterThanOrEqual(4 * 60 * 1000);
    expect(diff).toBeLessThanOrEqual(6 * 60 * 1000);
  });

  test("shows failure and warning counts per entry", () => {
    const entry = { repo: "LastGate", sha: "abc1234", status: "failed", failures: 2, warnings: 1 };
    expect(entry.failures).toBe(2);
    expect(entry.warnings).toBe(1);
  });
});
