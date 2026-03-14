import { describe, test, expect } from "bun:test";
import { getStatusFromRuns, getDetailedStatus } from "../status";

describe("Repo Status Aggregator", () => {
  test("all passed runs → status passing", () => {
    const runs = [
      { status: "passed", created_at: "2026-01-15" },
      { status: "passed", created_at: "2026-01-14" },
      { status: "passed", created_at: "2026-01-13" },
    ];
    const result = getStatusFromRuns(runs);
    expect(result.label).toBe("passing");
    expect(result.color).toBe("#4c1");
  });

  test("runs with failure → status failing", () => {
    const runs = [
      { status: "passed", created_at: "2026-01-15" },
      { status: "failed", created_at: "2026-01-14" },
      { status: "passed", created_at: "2026-01-13" },
    ];
    const result = getStatusFromRuns(runs);
    expect(result.label).toBe("failing");
    expect(result.color).toBe("#e05d44");
  });

  test("warnings but no failures → status warnings", () => {
    const runs = [
      { status: "passed", created_at: "2026-01-15" },
      { status: "warned", created_at: "2026-01-14" },
    ];
    const result = getStatusFromRuns(runs);
    expect(result.label).toBe("warnings");
    expect(result.color).toBe("#dfb317");
  });

  test("no runs → status unknown", () => {
    const result = getStatusFromRuns([]);
    expect(result.label).toBe("unknown");
    expect(result.color).toBe("#9f9f9f");
  });

  test("only looks at most recent 5 runs", () => {
    const runs = [
      { status: "passed", created_at: "2026-01-20" },
      { status: "passed", created_at: "2026-01-19" },
      { status: "passed", created_at: "2026-01-18" },
      { status: "passed", created_at: "2026-01-17" },
      { status: "passed", created_at: "2026-01-16" },
      { status: "failed", created_at: "2026-01-15" }, // 6th, should be ignored
    ];
    const result = getStatusFromRuns(runs);
    expect(result.label).toBe("passing");
  });
});

describe("Detailed Status", () => {
  test("100% pass rate", () => {
    const result = getDetailedStatus([{ status: "passed" }, { status: "passed" }]);
    expect(result.label).toContain("2/2");
    expect(result.label).toContain("100%");
    expect(result.color).toBe("#4c1");
  });

  test("low pass rate shows red", () => {
    const runs = [
      { status: "passed" },
      { status: "failed" },
      { status: "failed" },
      { status: "failed" },
      { status: "failed" },
    ];
    const result = getDetailedStatus(runs);
    expect(result.label).toContain("1/5");
    expect(result.label).toContain("20%");
    expect(result.color).toBe("#e05d44");
  });

  test("medium pass rate shows yellow", () => {
    const runs = Array.from({ length: 10 }, (_, i) => ({
      status: i < 8 ? "passed" : "failed",
    }));
    const result = getDetailedStatus(runs);
    expect(result.label).toContain("80%");
    expect(result.color).toBe("#dfb317");
  });

  test("no runs shows unknown", () => {
    const result = getDetailedStatus([]);
    expect(result.label).toBe("unknown");
  });
});
