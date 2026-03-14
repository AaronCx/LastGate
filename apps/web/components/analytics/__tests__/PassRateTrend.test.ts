import { describe, test, expect } from "bun:test";

// Test the data logic of PassRateTrend (Recharts component renders in browser only)
describe("Pass Rate Trend - Data Logic", () => {
  function calculatePassRate(checks: { status: string }[]): number {
    if (checks.length === 0) return 0;
    const passed = checks.filter((c) => c.status === "passed").length;
    return Math.round((passed / checks.length) * 100);
  }

  test("100% pass rate for all passing", () => {
    const checks = [{ status: "passed" }, { status: "passed" }, { status: "passed" }];
    expect(calculatePassRate(checks)).toBe(100);
  });

  test("0% pass rate for all failing", () => {
    const checks = [{ status: "failed" }, { status: "failed" }];
    expect(calculatePassRate(checks)).toBe(0);
  });

  test("50% for mixed results", () => {
    const checks = [{ status: "passed" }, { status: "failed" }];
    expect(calculatePassRate(checks)).toBe(50);
  });

  test("0% for zero checks (no data)", () => {
    expect(calculatePassRate([])).toBe(0);
  });

  test("handles warned status correctly", () => {
    const checks = [{ status: "passed" }, { status: "warned" }, { status: "passed" }];
    expect(calculatePassRate(checks)).toBe(67); // 2/3
  });
});
