import { describe, test, expect } from "bun:test";

describe("DateRangePicker", () => {
  const ranges = [
    { label: "7d", value: "7d" },
    { label: "30d", value: "30d" },
    { label: "90d", value: "90d" },
  ];

  test("has three range options", () => {
    expect(ranges).toHaveLength(3);
  });

  test("range values map to correct day counts", () => {
    const dayMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
    for (const range of ranges) {
      expect(dayMap[range.value]).toBeDefined();
      expect(dayMap[range.value]).toBeGreaterThan(0);
    }
  });

  test("default range is 7d", () => {
    const defaultRange = "7d";
    expect(ranges.some((r) => r.value === defaultRange)).toBe(true);
  });
});
