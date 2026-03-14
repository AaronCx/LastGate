import { describe, test, expect } from "bun:test";
import { estimateCost, estimateTokenCount } from "../../packages/engine/src/ai/cost";
import { getStatusFromRuns, getDetailedStatus } from "../../packages/engine/src/badge/status";
import { canPerform } from "../../apps/web/lib/permissions";

describe("Analytics + All Features Integration", () => {
  test("AI suggestion costs are calculable for analytics", () => {
    const cost = estimateCost("gpt-4o-mini", 500, 200);
    expect(cost).toBeGreaterThan(0);
    expect(typeof cost).toBe("number");
  });

  test("token estimation works for analytics tracking", () => {
    const tokens = estimateTokenCount("This is a test prompt for analytics");
    expect(tokens).toBeGreaterThan(0);
  });

  test("repo status can be aggregated for analytics dashboard", () => {
    const runs = [
      { status: "passed", created_at: "2026-01-15" },
      { status: "failed", created_at: "2026-01-14" },
      { status: "passed", created_at: "2026-01-13" },
    ];
    const status = getStatusFromRuns(runs);
    expect(["passing", "failing", "warnings", "unknown"]).toContain(status.label);
  });

  test("detailed status provides pass count for analytics", () => {
    const runs = [
      { status: "passed" },
      { status: "passed" },
      { status: "failed" },
    ];
    const detail = getDetailedStatus(runs);
    expect(detail.label).toContain("2/3");
    expect(detail.label).toContain("67%");
  });

  test("team context filters — viewer can see analytics", () => {
    expect(canPerform("viewer", "view")).toBe(true);
  });

  test("team context filters — developer can see analytics", () => {
    expect(canPerform("developer", "view")).toBe(true);
  });
});
