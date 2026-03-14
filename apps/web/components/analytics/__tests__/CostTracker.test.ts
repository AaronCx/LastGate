import { describe, test, expect } from "bun:test";

describe("Cost Tracker - Data Logic", () => {
  interface AiUsageSummary {
    totalTokens: number;
    totalCost: number;
    totalSuggestions: number;
    avgTokensPerSuggestion: number;
  }

  function summarizeUsage(records: { tokens: number; cost: number }[]): AiUsageSummary {
    if (records.length === 0) {
      return { totalTokens: 0, totalCost: 0, totalSuggestions: 0, avgTokensPerSuggestion: 0 };
    }
    const totalTokens = records.reduce((sum, r) => sum + r.tokens, 0);
    const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
    return {
      totalTokens,
      totalCost: Math.round(totalCost * 10000) / 10000,
      totalSuggestions: records.length,
      avgTokensPerSuggestion: Math.round(totalTokens / records.length),
    };
  }

  test("zero usage shows $0.00", () => {
    const summary = summarizeUsage([]);
    expect(summary.totalCost).toBe(0);
    expect(summary.totalTokens).toBe(0);
    expect(summary.totalSuggestions).toBe(0);
  });

  test("calculates totals correctly", () => {
    const records = [
      { tokens: 500, cost: 0.001 },
      { tokens: 300, cost: 0.0008 },
    ];
    const summary = summarizeUsage(records);
    expect(summary.totalTokens).toBe(800);
    expect(summary.totalSuggestions).toBe(2);
    expect(summary.avgTokensPerSuggestion).toBe(400);
  });

  test("single record averages correctly", () => {
    const summary = summarizeUsage([{ tokens: 1000, cost: 0.005 }]);
    expect(summary.avgTokensPerSuggestion).toBe(1000);
    expect(summary.totalSuggestions).toBe(1);
  });
});
