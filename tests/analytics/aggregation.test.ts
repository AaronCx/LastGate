import { describe, test, expect } from "bun:test";

// Test the analytics aggregation logic used by the API endpoints
// These test the pure data transformation functions

describe("Analytics Aggregation", () => {
  // Helper: simulate the daily aggregation logic from the API
  function aggregateDaily(runs: { status: string; created_at: string }[]) {
    const dailyMap = new Map<string, { total: number; passed: number; failed: number; warned: number }>();
    for (const run of runs) {
      const day = run.created_at.slice(0, 10);
      const entry = dailyMap.get(day) || { total: 0, passed: 0, failed: 0, warned: 0 };
      entry.total++;
      if (run.status === "passed") entry.passed++;
      if (run.status === "failed") entry.failed++;
      if (run.status === "warned") entry.warned++;
      dailyMap.set(day, entry);
    }
    return Array.from(dailyMap.entries())
      .map(([day, v]) => ({
        day,
        total: v.total,
        passed: v.passed,
        failed: v.failed,
        warned: v.warned,
        passRate: v.total > 0 ? Math.round((v.passed / v.total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }

  // Helper: simulate failure breakdown logic
  function aggregateFailures(results: { check_type: string; status: string }[]) {
    const failureMap = new Map<string, number>();
    for (const r of results) {
      if (r.status === "fail") {
        failureMap.set(r.check_type, (failureMap.get(r.check_type) || 0) + 1);
      }
    }
    return Array.from(failureMap.entries())
      .map(([checkType, count]) => ({ checkType, count }))
      .sort((a, b) => b.count - a.count);
  }

  test("daily aggregation groups runs by date", () => {
    const runs = [
      { status: "passed", created_at: "2026-03-10T10:00:00Z" },
      { status: "passed", created_at: "2026-03-10T11:00:00Z" },
      { status: "failed", created_at: "2026-03-10T12:00:00Z" },
      { status: "passed", created_at: "2026-03-11T09:00:00Z" },
    ];
    const result = aggregateDaily(runs);
    expect(result).toHaveLength(2);
    expect(result[0].day).toBe("2026-03-10");
    expect(result[0].total).toBe(3);
    expect(result[0].passed).toBe(2);
    expect(result[0].failed).toBe(1);
    expect(result[1].day).toBe("2026-03-11");
    expect(result[1].total).toBe(1);
    expect(result[1].passed).toBe(1);
  });

  test("daily pass rate is calculated correctly", () => {
    const runs = [
      { status: "passed", created_at: "2026-03-10T10:00:00Z" },
      { status: "passed", created_at: "2026-03-10T11:00:00Z" },
      { status: "failed", created_at: "2026-03-10T12:00:00Z" },
    ];
    const result = aggregateDaily(runs);
    expect(result[0].passRate).toBe(66.7);
  });

  test("100% pass rate when all pass", () => {
    const runs = [
      { status: "passed", created_at: "2026-03-10T10:00:00Z" },
      { status: "passed", created_at: "2026-03-10T11:00:00Z" },
    ];
    const result = aggregateDaily(runs);
    expect(result[0].passRate).toBe(100);
  });

  test("0% pass rate when all fail", () => {
    const runs = [
      { status: "failed", created_at: "2026-03-10T10:00:00Z" },
      { status: "failed", created_at: "2026-03-10T11:00:00Z" },
    ];
    const result = aggregateDaily(runs);
    expect(result[0].passRate).toBe(0);
  });

  test("empty runs produce empty aggregation", () => {
    const result = aggregateDaily([]);
    expect(result).toHaveLength(0);
  });

  test("warned status is counted separately", () => {
    const runs = [
      { status: "warned", created_at: "2026-03-10T10:00:00Z" },
      { status: "passed", created_at: "2026-03-10T11:00:00Z" },
    ];
    const result = aggregateDaily(runs);
    expect(result[0].warned).toBe(1);
    expect(result[0].passed).toBe(1);
    expect(result[0].passRate).toBe(50);
  });

  test("failure breakdown counts by check_type", () => {
    const results = [
      { check_type: "secrets", status: "fail" },
      { check_type: "secrets", status: "fail" },
      { check_type: "lint", status: "fail" },
      { check_type: "lint", status: "pass" },
      { check_type: "build", status: "pass" },
    ];
    const breakdown = aggregateFailures(results);
    expect(breakdown[0].checkType).toBe("secrets");
    expect(breakdown[0].count).toBe(2);
    expect(breakdown[1].checkType).toBe("lint");
    expect(breakdown[1].count).toBe(1);
  });

  test("failure breakdown excludes passing checks", () => {
    const results = [
      { check_type: "lint", status: "pass" },
      { check_type: "build", status: "pass" },
    ];
    const breakdown = aggregateFailures(results);
    expect(breakdown).toHaveLength(0);
  });

  test("failure breakdown sorts by count descending", () => {
    const results = [
      { check_type: "lint", status: "fail" },
      { check_type: "secrets", status: "fail" },
      { check_type: "secrets", status: "fail" },
      { check_type: "secrets", status: "fail" },
      { check_type: "build", status: "fail" },
      { check_type: "build", status: "fail" },
    ];
    const breakdown = aggregateFailures(results);
    expect(breakdown[0].checkType).toBe("secrets");
    expect(breakdown[1].checkType).toBe("build");
    expect(breakdown[2].checkType).toBe("lint");
  });
});
