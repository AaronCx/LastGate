import { describe, test, expect } from "bun:test";

describe("Checks Per Day - Data Logic", () => {
  function groupByDay(checks: { date: string; status: string }[]): Map<string, { passed: number; failed: number; warned: number }> {
    const groups = new Map<string, { passed: number; failed: number; warned: number }>();
    for (const check of checks) {
      const day = check.date.split("T")[0];
      const existing = groups.get(day) || { passed: 0, failed: 0, warned: 0 };
      if (check.status === "passed") existing.passed++;
      else if (check.status === "failed") existing.failed++;
      else if (check.status === "warned") existing.warned++;
      groups.set(day, existing);
    }
    return groups;
  }

  test("groups checks by day correctly", () => {
    const checks = [
      { date: "2026-01-15T10:00:00Z", status: "passed" },
      { date: "2026-01-15T14:00:00Z", status: "failed" },
      { date: "2026-01-16T09:00:00Z", status: "passed" },
    ];
    const grouped = groupByDay(checks);
    expect(grouped.size).toBe(2);
    expect(grouped.get("2026-01-15")!.passed).toBe(1);
    expect(grouped.get("2026-01-15")!.failed).toBe(1);
    expect(grouped.get("2026-01-16")!.passed).toBe(1);
  });

  test("empty array returns empty map", () => {
    expect(groupByDay([]).size).toBe(0);
  });

  test("single day with multiple checks", () => {
    const checks = [
      { date: "2026-01-15T10:00:00Z", status: "passed" },
      { date: "2026-01-15T11:00:00Z", status: "passed" },
      { date: "2026-01-15T12:00:00Z", status: "warned" },
    ];
    const grouped = groupByDay(checks);
    const day = grouped.get("2026-01-15")!;
    expect(day.passed).toBe(2);
    expect(day.warned).toBe(1);
    expect(day.failed).toBe(0);
  });
});
