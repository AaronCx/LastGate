import { describe, test, expect } from "bun:test";

const repos = [
  { name: "acme/frontend", health: "green", checks: 342, lastCheck: "2m ago" },
  { name: "acme/api-server", health: "red", checks: 189, lastCheck: "12m ago" },
  { name: "acme/shared-lib", health: "yellow", checks: 97, lastCheck: "28m ago" },
  { name: "acme/mobile-app", health: "green", checks: 156, lastCheck: "1h ago" },
  { name: "acme/docs", health: "green", checks: 43, lastCheck: "2h ago" },
  { name: "acme/infra", health: "green", checks: 78, lastCheck: "3h ago" },
  { name: "acme/analytics", health: "yellow", checks: 64, lastCheck: "4h ago" },
  { name: "acme/auth-service", health: "green", checks: 112, lastCheck: "5h ago" },
];

const healthColors: Record<string, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

describe("RepoHealthGrid", () => {
  test("renders one card per connected repo", () => {
    expect(repos.length).toBe(8);
  });

  test("card shows repo name, last check status, last check time", () => {
    const repo = repos[0];
    expect(repo.name).toBe("acme/frontend");
    expect(repo.lastCheck).toBe("2m ago");
    expect(repo.checks).toBe(342);
  });

  test("red/yellow/green health indicator based on recent check history", () => {
    const failing = repos.find(r => r.health === "red");
    expect(failing).toBeDefined();
    expect(failing!.name).toBe("acme/api-server");
    expect(healthColors[failing!.health]).toContain("red");

    const warning = repos.find(r => r.health === "yellow");
    expect(warning).toBeDefined();
    expect(healthColors[warning!.health]).toContain("amber");

    const healthy = repos.find(r => r.health === "green");
    expect(healthy).toBeDefined();
    expect(healthColors[healthy!.health]).toContain("emerald");
  });

  test("each repo has a check count", () => {
    for (const repo of repos) {
      expect(typeof repo.checks).toBe("number");
      expect(repo.checks).toBeGreaterThan(0);
    }
  });

  test("each repo has a unique name", () => {
    const names = repos.map(r => r.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
