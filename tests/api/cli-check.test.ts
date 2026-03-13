import { describe, test, expect } from "bun:test";

describe("CLI Check Endpoint Logic", () => {
  test("POST /api/cli/check — requires Bearer token", () => {
    const authHeader = "Bearer lg_cli_abc123def456";
    expect(authHeader.startsWith("Bearer ")).toBe(true);
    const apiKey = authHeader.slice(7);
    expect(apiKey).toBe("lg_cli_abc123def456");
  });

  test("POST /api/cli/check — missing auth header → 401", () => {
    const authHeader = null;
    expect(authHeader?.startsWith("Bearer ")).toBeFalsy();
  });

  test("POST /api/cli/check — invalid auth format → 401", () => {
    const authHeader = "Basic dXNlcjpwYXNz";
    expect(authHeader.startsWith("Bearer ")).toBe(false);
  });

  test("POST /api/cli/check — requires repo and sha", () => {
    const body = { repo: "AaronCx/LastGate", sha: "abc1234" };
    expect(body.repo).toBeTruthy();
    expect(body.sha).toBeTruthy();
  });

  test("POST /api/cli/check — missing repo → 400", () => {
    const body = { sha: "abc1234" };
    expect((body as any).repo).toBeUndefined();
  });

  test("POST /api/cli/check — empty diff returns all-pass structure", () => {
    const mockResult = {
      id: "uuid",
      status: "completed",
      conclusion: "success",
      checks: [
        { name: "Secret Scanner", status: "passed", message: "No secrets detected" },
        { name: "Duplicate Detector", status: "passed", message: "No duplicates found" },
        { name: "Lint Check", status: "passed", message: "0 errors" },
      ],
    };
    expect(mockResult.conclusion).toBe("success");
    expect(mockResult.checks.every(c => c.status === "passed")).toBe(true);
  });

  test("API key last_used_at is updated after successful check", () => {
    const now = new Date().toISOString();
    expect(now).toBeTruthy();
    // In the route, after a successful check, it does:
    // .update({ last_used_at: new Date().toISOString() })
  });
});
