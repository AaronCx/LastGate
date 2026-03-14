import { describe, test, expect } from "bun:test";

/**
 * Tests for the Overview page logic: statusColor mapping, date filtering,
 * data transformation for recent checks.
 */

// Extracted from page.tsx
function statusColor(status: string): string {
  switch (status) {
    case "passed": return "text-emerald-600 bg-emerald-50";
    case "failed": return "text-red-600 bg-red-50";
    case "warned": return "text-amber-600 bg-amber-50";
    case "running": return "text-blue-600 bg-blue-50";
    default: return "text-gray-600 bg-gray-50";
  }
}

interface RecentCheck {
  id: string;
  commit_sha: string;
  commit_message: string;
  commit_author: string;
  status: string;
  branch: string;
  created_at: string;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  is_agent_commit: boolean;
  repo_id: string;
}

function makeCheck(overrides: Partial<RecentCheck> = {}): RecentCheck {
  return {
    id: "check-1",
    commit_sha: "abc1234567890",
    commit_message: "Fix bug",
    commit_author: "dev",
    status: "passed",
    branch: "main",
    created_at: new Date().toISOString(),
    total_checks: 5,
    passed_checks: 5,
    failed_checks: 0,
    is_agent_commit: false,
    repo_id: "repo-1",
    ...overrides,
  };
}

describe("Overview page - statusColor", () => {
  test("passed returns emerald classes", () => {
    expect(statusColor("passed")).toBe("text-emerald-600 bg-emerald-50");
  });

  test("failed returns red classes", () => {
    expect(statusColor("failed")).toBe("text-red-600 bg-red-50");
  });

  test("warned returns amber classes", () => {
    expect(statusColor("warned")).toBe("text-amber-600 bg-amber-50");
  });

  test("running returns blue classes", () => {
    expect(statusColor("running")).toBe("text-blue-600 bg-blue-50");
  });

  test("unknown status returns gray classes", () => {
    expect(statusColor("unknown")).toBe("text-gray-600 bg-gray-50");
  });

  test("empty string returns gray classes", () => {
    expect(statusColor("")).toBe("text-gray-600 bg-gray-50");
  });

  test("each status color string contains both text and bg classes", () => {
    for (const status of ["passed", "failed", "warned", "running", "other"]) {
      const result = statusColor(status);
      expect(result).toContain("text-");
      expect(result).toContain("bg-");
    }
  });
});

describe("Overview page - date filtering (checks today)", () => {
  test("filters checks created today", () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const checks = [
      makeCheck({ id: "1", created_at: today.toISOString() }),
      makeCheck({ id: "2", created_at: yesterday.toISOString() }),
      makeCheck({ id: "3", created_at: today.toISOString() }),
    ];

    const todayChecks = checks.filter((c) => {
      const d = new Date(c.created_at);
      return d.toDateString() === today.toDateString();
    });

    expect(todayChecks.length).toBe(2);
    expect(todayChecks.map((c) => c.id)).toEqual(["1", "3"]);
  });

  test("returns empty when no checks are from today", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const checks = [
      makeCheck({ id: "1", created_at: yesterday.toISOString() }),
    ];

    const today = new Date();
    const todayChecks = checks.filter((c) => {
      const d = new Date(c.created_at);
      return d.toDateString() === today.toDateString();
    });

    expect(todayChecks.length).toBe(0);
  });
});

describe("Overview page - status filtering", () => {
  test("counts failed checks", () => {
    const checks = [
      makeCheck({ id: "1", status: "passed" }),
      makeCheck({ id: "2", status: "failed" }),
      makeCheck({ id: "3", status: "failed" }),
      makeCheck({ id: "4", status: "warned" }),
    ];

    const failedCount = checks.filter((c) => c.status === "failed").length;
    expect(failedCount).toBe(2);
  });

  test("counts agent commits", () => {
    const checks = [
      makeCheck({ id: "1", is_agent_commit: true }),
      makeCheck({ id: "2", is_agent_commit: false }),
      makeCheck({ id: "3", is_agent_commit: true }),
    ];

    const agentCount = checks.filter((c) => c.is_agent_commit).length;
    expect(agentCount).toBe(2);
  });
});

describe("Overview page - data transformation", () => {
  test("API response normalization: array stays as array", () => {
    const data = [makeCheck({ id: "1" }), makeCheck({ id: "2" })];
    const result = Array.isArray(data) ? data : [];
    expect(result.length).toBe(2);
  });

  test("API response normalization: object with data field extracted", () => {
    const data = { data: [makeCheck({ id: "1" })] };
    const result = Array.isArray(data) ? data : data.data || [];
    expect(result.length).toBe(1);
  });

  test("API response normalization: non-array non-object defaults to empty", () => {
    const data = "unexpected" as unknown;
    const result = Array.isArray(data) ? data : (data as { data?: [] }).data || [];
    expect(result.length).toBe(0);
  });

  test("display uses commit_message or truncated sha fallback", () => {
    const withMessage = makeCheck({ commit_message: "Fix login bug", commit_sha: "abc1234567890" });
    const withoutMessage = makeCheck({ commit_message: "", commit_sha: "abc1234567890" });

    const display1 = withMessage.commit_message || withMessage.commit_sha?.slice(0, 7);
    const display2 = withoutMessage.commit_message || withoutMessage.commit_sha?.slice(0, 7);

    expect(display1).toBe("Fix login bug");
    expect(display2).toBe("abc1234");
  });

  test("recent activity is sliced to 8 items", () => {
    const checks = Array.from({ length: 12 }, (_, i) => makeCheck({ id: `check-${i}` }));
    const displayed = checks.slice(0, 8);
    expect(displayed.length).toBe(8);
  });
});
