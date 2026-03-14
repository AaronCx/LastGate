import { describe, test, expect } from "bun:test";

describe("Agent Reliability - Data Logic", () => {
  interface AgentStats {
    name: string;
    totalCommits: number;
    passRate: number;
    mostCommonFailure?: string;
  }

  function calculateAgentStats(
    commits: { author: string; isAgent: boolean; status: string; failureType?: string }[]
  ): AgentStats[] {
    const agentMap = new Map<string, { total: number; passed: number; failures: Map<string, number> }>();

    for (const commit of commits) {
      if (!commit.isAgent) continue;
      const existing = agentMap.get(commit.author) || { total: 0, passed: 0, failures: new Map() };
      existing.total++;
      if (commit.status === "passed") existing.passed++;
      if (commit.failureType) {
        existing.failures.set(commit.failureType, (existing.failures.get(commit.failureType) || 0) + 1);
      }
      agentMap.set(commit.author, existing);
    }

    return Array.from(agentMap.entries()).map(([name, stats]) => {
      let mostCommonFailure: string | undefined;
      let maxCount = 0;
      for (const [type, count] of stats.failures) {
        if (count > maxCount) {
          maxCount = count;
          mostCommonFailure = type;
        }
      }
      return {
        name,
        totalCommits: stats.total,
        passRate: Math.round((stats.passed / stats.total) * 100),
        mostCommonFailure,
      };
    });
  }

  test("calculates pass rate per agent", () => {
    const commits = [
      { author: "claude", isAgent: true, status: "passed" },
      { author: "claude", isAgent: true, status: "failed", failureType: "secrets" },
      { author: "claude", isAgent: true, status: "passed" },
    ];
    const stats = calculateAgentStats(commits);
    expect(stats.length).toBe(1);
    expect(stats[0].passRate).toBe(67);
    expect(stats[0].totalCommits).toBe(3);
  });

  test("identifies most common failure type", () => {
    const commits = [
      { author: "copilot", isAgent: true, status: "failed", failureType: "secrets" },
      { author: "copilot", isAgent: true, status: "failed", failureType: "lint" },
      { author: "copilot", isAgent: true, status: "failed", failureType: "secrets" },
    ];
    const stats = calculateAgentStats(commits);
    expect(stats[0].mostCommonFailure).toBe("secrets");
  });

  test("human commits are excluded", () => {
    const commits = [
      { author: "aaron", isAgent: false, status: "passed" },
      { author: "claude", isAgent: true, status: "passed" },
    ];
    const stats = calculateAgentStats(commits);
    expect(stats.length).toBe(1);
    expect(stats[0].name).toBe("claude");
  });

  test("empty commits returns empty array", () => {
    expect(calculateAgentStats([]).length).toBe(0);
  });

  test("100% pass rate for all-passing agent", () => {
    const commits = [
      { author: "claude", isAgent: true, status: "passed" },
      { author: "claude", isAgent: true, status: "passed" },
    ];
    const stats = calculateAgentStats(commits);
    expect(stats[0].passRate).toBe(100);
  });
});
