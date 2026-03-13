import { describe, test, expect } from "bun:test";

describe("FailureHeatmap", () => {
  function getIntensity(count: number, max: number): string {
    if (count === 0) return "bg-gray-100";
    const ratio = count / Math.max(max, 1);
    if (ratio > 0.75) return "bg-red-500";
    if (ratio > 0.5) return "bg-red-400";
    if (ratio > 0.25) return "bg-red-300";
    return "bg-red-200";
  }

  test("zero failures get gray color", () => {
    expect(getIntensity(0, 10)).toBe("bg-gray-100");
  });

  test("low failures get lightest red", () => {
    expect(getIntensity(1, 10)).toBe("bg-red-200");
  });

  test("medium failures get medium red", () => {
    expect(getIntensity(4, 10)).toBe("bg-red-300");
  });

  test("high failures get dark red", () => {
    expect(getIntensity(8, 10)).toBe("bg-red-500");
  });

  test("max failures get darkest red", () => {
    expect(getIntensity(10, 10)).toBe("bg-red-500");
  });

  test("handles max of 0 gracefully", () => {
    expect(getIntensity(0, 0)).toBe("bg-gray-100");
  });
});
