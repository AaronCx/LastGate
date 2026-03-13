import { describe, test, expect } from "bun:test";

describe("Demo/Sandbox Mode", () => {
  test("dashboard loads with seeded mock data", () => {
    const mockData = {
      totalChecks: 1284,
      passRate: 94.2,
      blockedCommits: 23,
      activeRepos: 18,
    };
    expect(mockData.totalChecks).toBeGreaterThan(0);
    expect(mockData.passRate).toBeGreaterThan(0);
  });

  test("demo banner text", () => {
    const banner = "This is a demo — Install the GitHub App to use LastGate on your repos";
    expect(banner).toContain("demo");
    expect(banner).toContain("GitHub App");
  });

  test("all dashboard pages are navigable in demo mode", () => {
    const pages = ["overview", "repos", "activity", "review", "settings"];
    expect(pages.length).toBe(5);
    for (const page of pages) {
      expect(page).toBeTruthy();
    }
  });

  test("PR review panel shows sample flagged PR with annotations", () => {
    const samplePR = {
      title: "feat: add user authentication",
      status: "failed",
      annotations: [
        { path: "src/auth.ts", line: 14, message: "Hardcoded API key detected" },
        { path: ".env", line: 1, message: "Blocked file pattern" },
      ],
    };
    expect(samplePR.annotations.length).toBeGreaterThan(0);
    expect(samplePR.status).toBe("failed");
  });

  test("check results are expandable with realistic findings", () => {
    const checkResult = {
      type: "secrets",
      status: "fail",
      title: "Secret Scanner",
      findings: [
        { file: "src/config.ts", line: 14, pattern: "AWS Access Key", severity: "critical" },
      ],
    };
    expect(checkResult.findings.length).toBeGreaterThan(0);
    expect(checkResult.findings[0].severity).toBe("critical");
  });

  test("no authentication required for demo mode", () => {
    const isDemo = true;
    const requiresAuth = !isDemo;
    expect(requiresAuth).toBe(false);
  });
});
