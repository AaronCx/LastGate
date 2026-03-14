import { describe, test, expect } from "bun:test";

/**
 * Tests for OverviewCards stat computation logic.
 * The component fetches from /api/analytics?range=7d and /api/repos,
 * then computes totalChecks, passRate, blockedCommits, and activeRepos.
 */

// Mirrors the computation from OverviewCards.tsx
function computeStats(
  analytics: { summary?: { total_runs?: number; passed?: number; failed?: number } },
  repos: Array<{ is_active: boolean; [key: string]: unknown }>
) {
  const totalChecks = analytics.summary?.total_runs || 0;
  const passed = analytics.summary?.passed || 0;
  const passRate = totalChecks > 0 ? Math.round((passed / totalChecks) * 1000) / 10 : 0;
  const blocked = analytics.summary?.failed || 0;

  return {
    totalChecks,
    passRate,
    blockedCommits: blocked,
    activeRepos: Array.isArray(repos) ? repos.filter((r) => r.is_active).length : 0,
  };
}

describe("OverviewCards - stat computation", () => {
  test("computes totalChecks from analytics summary", () => {
    const stats = computeStats({ summary: { total_runs: 150, passed: 100, failed: 50 } }, []);
    expect(stats.totalChecks).toBe(150);
  });

  test("computes passRate rounded to 1 decimal place", () => {
    const stats = computeStats({ summary: { total_runs: 3, passed: 2, failed: 1 } }, []);
    // 2/3 = 0.6666... -> 66.7%
    expect(stats.passRate).toBe(66.7);
  });

  test("passRate is 100 when all checks pass", () => {
    const stats = computeStats({ summary: { total_runs: 50, passed: 50, failed: 0 } }, []);
    expect(stats.passRate).toBe(100);
  });

  test("passRate is 0 when no checks pass", () => {
    const stats = computeStats({ summary: { total_runs: 10, passed: 0, failed: 10 } }, []);
    expect(stats.passRate).toBe(0);
  });

  test("passRate is 0 when totalChecks is 0 (avoids division by zero)", () => {
    const stats = computeStats({ summary: { total_runs: 0, passed: 0, failed: 0 } }, []);
    expect(stats.passRate).toBe(0);
  });

  test("passRate handles fractional rounding correctly", () => {
    // 1/7 = 0.142857... -> 14.3%
    const stats = computeStats({ summary: { total_runs: 7, passed: 1, failed: 6 } }, []);
    expect(stats.passRate).toBe(14.3);
  });

  test("passRate for 1/3 rounds to 33.3", () => {
    const stats = computeStats({ summary: { total_runs: 3, passed: 1, failed: 2 } }, []);
    expect(stats.passRate).toBe(33.3);
  });

  test("blockedCommits equals failed count from summary", () => {
    const stats = computeStats({ summary: { total_runs: 100, passed: 80, failed: 20 } }, []);
    expect(stats.blockedCommits).toBe(20);
  });

  test("activeRepos counts only repos with is_active true", () => {
    const repos = [
      { id: "1", is_active: true },
      { id: "2", is_active: false },
      { id: "3", is_active: true },
      { id: "4", is_active: false },
      { id: "5", is_active: true },
    ];
    const stats = computeStats({ summary: {} }, repos);
    expect(stats.activeRepos).toBe(3);
  });

  test("activeRepos is 0 when repos is not an array", () => {
    // The component checks Array.isArray(repos)
    const stats = computeStats({ summary: {} }, null as unknown as []);
    expect(stats.activeRepos).toBe(0);
  });

  test("activeRepos is 0 when all repos are inactive", () => {
    const repos = [
      { id: "1", is_active: false },
      { id: "2", is_active: false },
    ];
    const stats = computeStats({ summary: {} }, repos);
    expect(stats.activeRepos).toBe(0);
  });

  test("defaults to zeros when summary is missing", () => {
    const stats = computeStats({}, []);
    expect(stats.totalChecks).toBe(0);
    expect(stats.passRate).toBe(0);
    expect(stats.blockedCommits).toBe(0);
    expect(stats.activeRepos).toBe(0);
  });

  test("defaults to zeros when summary fields are undefined", () => {
    const stats = computeStats({ summary: {} }, []);
    expect(stats.totalChecks).toBe(0);
    expect(stats.passRate).toBe(0);
    expect(stats.blockedCommits).toBe(0);
  });
});
