import { describe, test, expect } from "bun:test";

// Test the agent analytics aggregation logic

describe("Agent Metrics", () => {
  // Helper: simulate agent reliability calculation
  function calcAgentReliability(runs: { commit_author: string; status: string; is_agent_commit: boolean }[]) {
    const agentRuns = runs.filter((r) => r.is_agent_commit);
    const authorMap = new Map<string, { total: number; passed: number; failed: number }>();
    for (const run of agentRuns) {
      const author = run.commit_author || "Unknown Agent";
      const entry = authorMap.get(author) || { total: 0, passed: 0, failed: 0 };
      entry.total++;
      if (run.status === "passed") entry.passed++;
      if (run.status === "failed") entry.failed++;
      authorMap.set(author, entry);
    }
    return Array.from(authorMap.entries())
      .map(([author, v]) => ({
        author,
        total: v.total,
        passed: v.passed,
        failed: v.failed,
        passRate: v.total > 0 ? Math.round((v.passed / v.total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  // Helper: simulate session heatmap
  function calcSessionHeatmap(runs: { created_at: string; is_agent_commit: boolean }[]) {
    const agentRuns = runs.filter((r) => r.is_agent_commit);
    const hourMap = new Map<number, number>();
    for (const run of agentRuns) {
      const hour = new Date(run.created_at).getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    }
    return Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      count: hourMap.get(h) || 0,
    }));
  }

  test("agent reliability groups by author", () => {
    const runs = [
      { commit_author: "Claude", status: "passed", is_agent_commit: true },
      { commit_author: "Claude", status: "failed", is_agent_commit: true },
      { commit_author: "Cursor", status: "passed", is_agent_commit: true },
      { commit_author: "Human Dev", status: "passed", is_agent_commit: false },
    ];
    const result = calcAgentReliability(runs);
    expect(result).toHaveLength(2);
    expect(result[0].author).toBe("Claude");
    expect(result[0].total).toBe(2);
    expect(result[0].passRate).toBe(50);
    expect(result[1].author).toBe("Cursor");
    expect(result[1].total).toBe(1);
    expect(result[1].passRate).toBe(100);
  });

  test("human commits are excluded from agent reliability", () => {
    const runs = [
      { commit_author: "Dev", status: "passed", is_agent_commit: false },
      { commit_author: "Dev", status: "failed", is_agent_commit: false },
    ];
    const result = calcAgentReliability(runs);
    expect(result).toHaveLength(0);
  });

  test("unknown agent author gets default label", () => {
    const runs = [
      { commit_author: "", status: "passed", is_agent_commit: true },
    ];
    const result = calcAgentReliability(runs);
    expect(result[0].author).toBe("Unknown Agent");
  });

  test("session heatmap covers all 24 hours", () => {
    const runs = [
      { created_at: "2026-03-10T14:00:00Z", is_agent_commit: true },
      { created_at: "2026-03-10T14:30:00Z", is_agent_commit: true },
      { created_at: "2026-03-10T09:00:00Z", is_agent_commit: true },
    ];
    const heatmap = calcSessionHeatmap(runs);
    expect(heatmap).toHaveLength(24);
    const hour14 = heatmap.find((h) => h.hour === 14);
    expect(hour14?.count).toBe(2);
    const hour9 = heatmap.find((h) => h.hour === 9);
    expect(hour9?.count).toBe(1);
    const hour0 = heatmap.find((h) => h.hour === 0);
    expect(hour0?.count).toBe(0);
  });

  test("session heatmap excludes human commits", () => {
    const runs = [
      { created_at: "2026-03-10T10:00:00Z", is_agent_commit: false },
    ];
    const heatmap = calcSessionHeatmap(runs);
    expect(heatmap.every((h) => h.count === 0)).toBe(true);
  });

  test("agent vs human summary", () => {
    const runs = [
      { commit_author: "Claude", status: "passed", is_agent_commit: true },
      { commit_author: "Claude", status: "failed", is_agent_commit: true },
      { commit_author: "Dev", status: "passed", is_agent_commit: false },
      { commit_author: "Dev", status: "passed", is_agent_commit: false },
      { commit_author: "Dev", status: "passed", is_agent_commit: false },
    ];
    const agentRuns = runs.filter((r) => r.is_agent_commit);
    const humanRuns = runs.filter((r) => !r.is_agent_commit);

    expect(agentRuns.length).toBe(2);
    expect(humanRuns.length).toBe(3);

    const agentPassRate = Math.round(
      (agentRuns.filter((r) => r.status === "passed").length / agentRuns.length) * 1000
    ) / 10;
    const humanPassRate = Math.round(
      (humanRuns.filter((r) => r.status === "passed").length / humanRuns.length) * 1000
    ) / 10;

    expect(agentPassRate).toBe(50);
    expect(humanPassRate).toBe(100);
  });
});
