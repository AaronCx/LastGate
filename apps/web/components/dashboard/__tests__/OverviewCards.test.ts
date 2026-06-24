import { describe, test, expect } from "bun:test";
import { deriveAnalyticsKpis, repoCountFromResponse } from "../OverviewCards";

// These import and exercise the REAL mapping helpers the component uses, against
// the ACTUAL /api/analytics and /api/repos response shapes. The previous test
// re-implemented a third, snake_case shape (summary.total_runs) that matched
// neither the component nor the API, so it stayed green while every card showed 0.

describe("OverviewCards — KPI mapping against the real API shape", () => {
  const analytics = {
    range: "7d",
    summary: { totalRuns: 150, passedRuns: 100, failedRuns: 50, passRate: 66.7 },
    dailyPassRate: [
      { day: "2026-01-01", total: 10, passed: 7, failed: 3, passRate: 70 },
      { day: "2026-01-02", total: 5, passed: 5, failed: 0, passRate: 100 },
    ],
    topFailures: [],
  };

  test("reads totalChecks/passRate/blockedCommits from summary.*", () => {
    const k = deriveAnalyticsKpis(analytics as any);
    expect(k.totalChecks).toBe(150);
    expect(k.passRate).toBe(66.7);
    expect(k.blockedCommits).toBe(50);
    expect(k.daily.length).toBe(2);
  });

  test("defaults to zeros when summary is missing (no crash)", () => {
    const k = deriveAnalyticsKpis({} as any);
    expect(k.totalChecks).toBe(0);
    expect(k.passRate).toBe(0);
    expect(k.blockedCommits).toBe(0);
    expect(k.daily).toEqual([]);
  });

  test("repoCount reads { data: [...] } (the real /api/repos shape)", () => {
    expect(repoCountFromResponse({ data: [{ id: "1" }, { id: "2" }, { id: "3" }] })).toBe(3);
    expect(repoCountFromResponse([{ id: "1" }])).toBe(1); // tolerates a bare array
    expect(repoCountFromResponse(null)).toBe(0);
    expect(repoCountFromResponse({ repos: [{ id: "1" }] })).toBe(0); // wrong key -> 0, not a crash
  });
});
