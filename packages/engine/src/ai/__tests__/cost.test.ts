import { describe, test, expect } from "bun:test";
import { estimateCost, isWithinBudget, estimateTokenCount } from "../cost";

describe("Cost Controls", () => {
  // Budget
  test("isWithinBudget returns true when under budget", () => {
    expect(isWithinBudget(3000, 4000)).toBe(true);
  });

  test("isWithinBudget returns false when over budget", () => {
    expect(isWithinBudget(5000, 4000)).toBe(false);
  });

  test("isWithinBudget returns false when exactly at budget", () => {
    expect(isWithinBudget(4000, 4000)).toBe(false);
  });

  // Cost estimation
  test("estimateCost calculates correctly for gpt-4o-mini", () => {
    const cost = estimateCost("gpt-4o-mini", 1000, 1000);
    // input: 1000/1000 * 0.00015 = 0.00015
    // output: 1000/1000 * 0.0006 = 0.0006
    // total: 0.00075
    expect(cost).toBeCloseTo(0.00075, 5);
  });

  test("estimateCost calculates correctly for gpt-4o", () => {
    const cost = estimateCost("gpt-4o", 1000, 1000);
    // input: 1000/1000 * 0.005 = 0.005
    // output: 1000/1000 * 0.015 = 0.015
    // total: 0.02
    expect(cost).toBeCloseTo(0.02, 5);
  });

  test("estimateCost uses default model for unknown model", () => {
    const cost = estimateCost("unknown-model", 1000, 1000);
    // Falls back to gpt-4o-mini pricing
    expect(cost).toBeCloseTo(0.00075, 5);
  });

  test("estimateCost handles zero tokens", () => {
    expect(estimateCost("gpt-4o-mini", 0, 0)).toBe(0);
  });

  // Token count estimation
  test("estimateTokenCount approximates correctly (4 chars per token)", () => {
    const count = estimateTokenCount("Hello, world! This is a test.");
    // 29 chars / 4 = 7.25, ceil = 8
    expect(count).toBe(8);
  });

  test("estimateTokenCount returns 0 for empty string", () => {
    expect(estimateTokenCount("")).toBe(0);
  });

  test("estimateTokenCount handles long text", () => {
    const longText = "a".repeat(4000);
    expect(estimateTokenCount(longText)).toBe(1000);
  });
});
