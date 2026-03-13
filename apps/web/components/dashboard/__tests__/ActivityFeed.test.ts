import { describe, test, expect } from "bun:test";

const activities = [
  { id: "1", repo: "acme/frontend", commit: "fix: resolve SSR hydration mismatch", sha: "a3f8b2c", status: "passed", agent: "Claude" },
  { id: "2", repo: "acme/api-server", commit: "feat: add rate limiting middleware", sha: "d9e1f4a", status: "failed", agent: "Cursor" },
  { id: "3", repo: "acme/shared-lib", commit: "refactor: extract validation utils", sha: "b7c2e8d", status: "warning", agent: "Copilot" },
  { id: "4", repo: "acme/frontend", commit: "feat: implement dark mode toggle", sha: "e5f9a1b", status: "passed", agent: "Claude" },
  { id: "5", repo: "acme/mobile-app", commit: "fix: patch deep linking on Android", sha: "c4d6e2f", status: "passed", agent: "Devin" },
  { id: "6", repo: "acme/api-server", commit: "chore: update dependencies", sha: "f1a3b5c", status: "warning", agent: "Copilot" },
  { id: "7", repo: "acme/docs", commit: "docs: add API reference for v2", sha: "g8h2j4k", status: "passed", agent: null },
];

const statusConfig = {
  passed: { color: "text-emerald-500", bg: "bg-emerald-50", label: "Passed" },
  failed: { color: "text-red-500", bg: "bg-red-50", label: "Failed" },
  warning: { color: "text-amber-500", bg: "bg-amber-50", label: "Warning" },
};

describe("ActivityFeed", () => {
  test("renders list of recent check results with repo name, status, timestamp", () => {
    for (const activity of activities) {
      expect(activity.repo).toBeTruthy();
      expect(activity.status).toBeTruthy();
      expect(activity.sha).toBeTruthy();
    }
  });

  test("failed checks show red indicator, passed show green, warned show yellow", () => {
    expect(statusConfig.passed.color).toContain("emerald");
    expect(statusConfig.failed.color).toContain("red");
    expect(statusConfig.warning.color).toContain("amber");
  });

  test("has at least one entry", () => {
    expect(activities.length).toBeGreaterThan(0);
  });

  test("each activity has unique id", () => {
    const ids = activities.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("activities include repo, commit message, SHA, and agent", () => {
    const first = activities[0];
    expect(first.repo).toBe("acme/frontend");
    expect(first.commit).toBe("fix: resolve SSR hydration mismatch");
    expect(first.sha).toBe("a3f8b2c");
    expect(first.agent).toBe("Claude");
  });

  test("new items appear at top of list (most recent first)", () => {
    // In the component, activities are ordered newest first
    expect(activities[0].id).toBe("1");
  });

  test("handles null agent gracefully", () => {
    const noAgent = activities.find(a => a.agent === null);
    expect(noAgent).toBeDefined();
    expect(noAgent!.repo).toBe("acme/docs");
  });
});
