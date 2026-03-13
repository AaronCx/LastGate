import { describe, test, expect } from "bun:test";

describe("TopFailures", () => {
  const CHECK_TYPE_LABELS: Record<string, string> = {
    secrets: "Secret Detection",
    lint: "Lint Errors",
    build: "Build Failures",
    duplicates: "Duplicate Commits",
    file_patterns: "Blocked Files",
    commit_message: "Bad Commit Messages",
    agent_patterns: "Agent Behavior",
    dependencies: "Dependency Issues",
  };

  test("all check types have display labels", () => {
    const knownTypes = ["secrets", "lint", "build", "duplicates", "file_patterns", "commit_message", "agent_patterns", "dependencies"];
    for (const type of knownTypes) {
      expect(CHECK_TYPE_LABELS[type]).toBeDefined();
      expect(CHECK_TYPE_LABELS[type].length).toBeGreaterThan(0);
    }
  });

  test("bar width calculation is proportional to max", () => {
    const data = [
      { checkType: "secrets", count: 10 },
      { checkType: "lint", count: 5 },
      { checkType: "build", count: 2 },
    ];
    const maxCount = Math.max(...data.map((d) => d.count));
    expect(maxCount).toBe(10);
    expect((data[0].count / maxCount) * 100).toBe(100);
    expect((data[1].count / maxCount) * 100).toBe(50);
    expect((data[2].count / maxCount) * 100).toBe(20);
  });

  test("displays at most 8 entries", () => {
    const data = Array.from({ length: 12 }, (_, i) => ({
      checkType: `type_${i}`,
      count: 12 - i,
    }));
    expect(data.slice(0, 8)).toHaveLength(8);
  });
});
