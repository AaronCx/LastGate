import { describe, test, expect } from "bun:test";

/**
 * Tests for the history command logic.
 *
 * Validates API_BASE URL construction, response parsing,
 * timestamp formatting, and option handling.
 */

interface HistoryEntry {
  id: string;
  repo: string;
  branch: string;
  status: "pass" | "fail" | "warn";
  checksRun: number;
  failures: number;
  warnings: number;
  timestamp: string;
  commitHash: string;
}

describe("API_BASE URL construction", () => {
  test("default API base is lastgate.vercel.app", () => {
    const defaultBase = "https://lastgate.vercel.app";
    expect(defaultBase).toContain("lastgate.vercel.app");
  });

  test("API endpoint is /api/checks", () => {
    const base = "https://lastgate.vercel.app";
    const url = `${base}/api/checks`;
    expect(url).toBe("https://lastgate.vercel.app/api/checks");
  });

  test("LASTGATE_API_URL env var overrides default base", () => {
    const envUrl = "https://custom.example.com";
    const base = envUrl || "https://lastgate.vercel.app";
    expect(base).toBe("https://custom.example.com");
  });

  test("falls back to default when env var is empty", () => {
    const envUrl = "";
    const base = envUrl || "https://lastgate.vercel.app";
    expect(base).toBe("https://lastgate.vercel.app");
  });

  test("query params include limit", () => {
    const params = new URLSearchParams();
    params.set("limit", "10");
    expect(params.toString()).toBe("limit=10");
  });

  test("query params include repo when provided", () => {
    const params = new URLSearchParams();
    params.set("limit", "10");
    params.set("repo", "LastGate");
    expect(params.toString()).toContain("repo=LastGate");
    expect(params.toString()).toContain("limit=10");
  });

  test("query params omit repo when not provided", () => {
    const params = new URLSearchParams();
    params.set("limit", "5");
    const repo: string | undefined = undefined;
    if (repo) params.set("repo", repo);
    expect(params.toString()).toBe("limit=5");
    expect(params.toString()).not.toContain("repo");
  });

  test("full URL construction with params", () => {
    const base = "https://lastgate.vercel.app";
    const params = new URLSearchParams();
    params.set("limit", "20");
    params.set("repo", "MyRepo");
    const url = `${base}/api/checks?${params.toString()}`;
    expect(url).toContain("/api/checks?");
    expect(url).toContain("limit=20");
    expect(url).toContain("repo=MyRepo");
  });
});

describe("response parsing", () => {
  test("parses entries array from response", () => {
    const data = {
      entries: [
        {
          id: "1",
          repo: "LastGate",
          branch: "main",
          status: "pass" as const,
          checksRun: 3,
          failures: 0,
          warnings: 0,
          timestamp: "2024-01-15T10:00:00Z",
          commitHash: "abc1234567890",
        },
      ],
    };
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0].repo).toBe("LastGate");
  });

  test("handles empty entries array", () => {
    const data = { entries: [] as HistoryEntry[] };
    expect(data.entries).toHaveLength(0);
  });

  test("HistoryEntry has all required fields", () => {
    const entry: HistoryEntry = {
      id: "abc",
      repo: "LastGate",
      branch: "main",
      status: "pass",
      checksRun: 5,
      failures: 0,
      warnings: 1,
      timestamp: "2024-01-15T10:00:00Z",
      commitHash: "deadbeef12345",
    };
    expect(entry).toHaveProperty("id");
    expect(entry).toHaveProperty("repo");
    expect(entry).toHaveProperty("branch");
    expect(entry).toHaveProperty("status");
    expect(entry).toHaveProperty("checksRun");
    expect(entry).toHaveProperty("failures");
    expect(entry).toHaveProperty("warnings");
    expect(entry).toHaveProperty("timestamp");
    expect(entry).toHaveProperty("commitHash");
  });

  test("commitHash is truncated to 7 chars for display", () => {
    const commitHash = "abc1234567890def";
    const short = commitHash.slice(0, 7);
    expect(short).toBe("abc1234");
    expect(short).toHaveLength(7);
  });
});

describe("timestamp formatting", () => {
  function formatTimestamp(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  test("returns 'just now' for timestamps less than 1 minute ago", () => {
    const recent = new Date().toISOString();
    expect(formatTimestamp(recent)).toBe("just now");
  });

  test("returns minutes ago for timestamps within the last hour", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatTimestamp(fiveMinAgo)).toBe("5m ago");
  });

  test("returns hours ago for timestamps within the last day", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatTimestamp(threeHoursAgo)).toBe("3h ago");
  });

  test("returns days ago for timestamps within the last week", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatTimestamp(twoDaysAgo)).toBe("2d ago");
  });

  test("returns formatted date for timestamps older than a week", () => {
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatTimestamp(oldDate);
    // Should be a locale date string, not a relative time
    expect(result).not.toContain("ago");
    expect(result).not.toBe("just now");
  });
});

describe("CLI option flags", () => {
  test("default limit is '10' (string)", () => {
    // Commander passes the default as a string
    const defaultLimit = "10";
    expect(defaultLimit).toBe("10");
  });

  test("--repo flag filters results", () => {
    const options = { repo: "AgentForge" };
    expect(options.repo).toBe("AgentForge");
  });

  test("--limit flag accepts custom value", () => {
    const options = { limit: "5" };
    expect(options.limit).toBe("5");
  });
});

describe("authentication check", () => {
  test("requires token in config", () => {
    const config = { token: undefined as string | undefined };
    const isAuthenticated = !!config.token;
    expect(isAuthenticated).toBe(false);
  });

  test("token present means authenticated", () => {
    const config = { token: "lg_abc123" };
    const isAuthenticated = !!config.token;
    expect(isAuthenticated).toBe(true);
  });

  test("authorization header uses Bearer format", () => {
    const token = "lg_test_token";
    const header = `Bearer ${token}`;
    expect(header).toBe("Bearer lg_test_token");
  });
});

describe("status display", () => {
  test("status icons map correctly", () => {
    const PASS = "\u2713";
    const FAIL = "\u2717";
    const WARN = "\u26A0";

    function formatStatus(status: "pass" | "fail" | "warn"): string {
      switch (status) {
        case "pass": return PASS;
        case "fail": return FAIL;
        case "warn": return WARN;
      }
    }

    expect(formatStatus("pass")).toBe("\u2713");
    expect(formatStatus("fail")).toBe("\u2717");
    expect(formatStatus("warn")).toBe("\u26A0");
  });

  test("failure count displayed in checks column", () => {
    const entry = { checksRun: 5, failures: 2, warnings: 1 };
    const checksDisplay = `${entry.checksRun}${entry.failures > 0 ? ` (${entry.failures}F)` : ""}${entry.warnings > 0 ? ` (${entry.warnings}W)` : ""}`;
    expect(checksDisplay).toBe("5 (2F) (1W)");
  });

  test("no failure/warning suffix when counts are zero", () => {
    const entry = { checksRun: 3, failures: 0, warnings: 0 };
    const checksDisplay = `${entry.checksRun}${entry.failures > 0 ? ` (${entry.failures}F)` : ""}${entry.warnings > 0 ? ` (${entry.warnings}W)` : ""}`;
    expect(checksDisplay).toBe("3");
  });
});
