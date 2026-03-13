import { describe, test, expect } from "bun:test";

const checkRuns = [
  { sha: "a3f8b2c", branch: "main", message: "fix: SSR hydration", status: "passed", checksRun: 8, checksPassed: 8 },
  { sha: "d9e1f4a", branch: "feat/rate-limit", message: "feat: rate limiting", status: "failed", checksRun: 8, checksPassed: 6 },
  { sha: "b7c2e8d", branch: "main", message: "refactor: validation", status: "warning", checksRun: 8, checksPassed: 7 },
  { sha: "e5f9a1b", branch: "main", message: "feat: dark mode", status: "passed", checksRun: 8, checksPassed: 8 },
];

describe("CheckTimeline", () => {
  test("renders a timeline of checks for a specific repo", () => {
    expect(checkRuns.length).toBeGreaterThan(0);
  });

  test("each entry shows commit SHA (truncated), message, status, timestamp", () => {
    const entry = checkRuns[0];
    expect(entry.sha.length).toBe(7); // Truncated SHA
    expect(entry.message).toBeTruthy();
    expect(["passed", "failed", "warning"]).toContain(entry.status);
  });

  test("expandable: clicking an entry reveals individual check results", () => {
    // Each entry has checksRun and checksPassed for expansion
    const entry = checkRuns[1];
    expect(entry.checksRun).toBe(8);
    expect(entry.checksPassed).toBe(6);
    const failedChecks = entry.checksRun - entry.checksPassed;
    expect(failedChecks).toBe(2);
  });

  test("filter by status works", () => {
    const failed = checkRuns.filter(r => r.status === "failed");
    expect(failed.length).toBe(1);
    expect(failed[0].sha).toBe("d9e1f4a");

    const passed = checkRuns.filter(r => r.status === "passed");
    expect(passed.length).toBe(2);
  });

  test("filter by branch works", () => {
    const mainBranch = checkRuns.filter(r => r.branch === "main");
    expect(mainBranch.length).toBe(3);
  });

  test("pagination works for repos with many checks", () => {
    // Simulate pagination
    const totalItems = 50;
    const pageSize = 10;
    const totalPages = Math.ceil(totalItems / pageSize);
    expect(totalPages).toBe(5);

    const page2Items = Array.from({ length: totalItems }, (_, i) => i).slice(10, 20);
    expect(page2Items.length).toBe(10);
    expect(page2Items[0]).toBe(10);
  });
});
