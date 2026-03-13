import { describe, test, expect, beforeEach } from "bun:test";
import { buildPrompt, SYSTEM_PROMPT, CHECK_TYPE_PROMPTS } from "../../packages/engine/src/ai/prompts";
import { getCacheKey, getCachedSuggestion, cacheSuggestion, clearCache, getCacheSize } from "../../packages/engine/src/ai/cache";
import { estimateCost, isWithinBudget, estimateTokenCount } from "../../packages/engine/src/ai/cost";
import { getSurroundingLines, generateFixSuggestions } from "../../packages/engine/src/ai/suggest-fix";

describe("AI Prompts", () => {
  test("system prompt includes key rules", () => {
    expect(SYSTEM_PROMPT).toContain("specific and actionable");
    expect(SYSTEM_PROMPT).toContain("minimal");
    expect(SYSTEM_PROMPT).toContain("Never suggest disabling");
  });

  test("all check types have prompts", () => {
    const types = ["secrets", "lint", "build", "commit_message", "file_patterns", "dependencies", "duplicates", "agent_patterns"];
    for (const type of types) {
      expect(CHECK_TYPE_PROMPTS[type]).toBeDefined();
      expect(CHECK_TYPE_PROMPTS[type].length).toBeGreaterThan(0);
    }
  });

  test("buildPrompt combines system and type prompts", () => {
    const prompt = buildPrompt("secrets");
    expect(prompt).toContain(SYSTEM_PROMPT);
    expect(prompt).toContain("environment variable");
  });

  test("buildPrompt handles unknown check types", () => {
    const prompt = buildPrompt("unknown_type");
    expect(prompt).toContain(SYSTEM_PROMPT);
  });
});

describe("AI Cache", () => {
  beforeEach(() => clearCache());

  test("getCacheKey generates consistent hashes", () => {
    const key1 = getCacheKey("lint", "src/index.ts", "Missing semicolon");
    const key2 = getCacheKey("lint", "src/index.ts", "Missing semicolon");
    expect(key1).toBe(key2);
  });

  test("different inputs produce different keys", () => {
    const key1 = getCacheKey("lint", "src/a.ts", "Error A");
    const key2 = getCacheKey("lint", "src/b.ts", "Error B");
    expect(key1).not.toBe(key2);
  });

  test("cache miss returns null", () => {
    expect(getCachedSuggestion("nonexistent")).toBeNull();
  });

  test("cache stores and retrieves suggestions", () => {
    const suggestion = { explanation: "Fix it", fix: "code", confidence: "high" as const };
    cacheSuggestion("test-key", suggestion);
    const cached = getCachedSuggestion("test-key");
    expect(cached).toEqual(suggestion);
  });

  test("clearCache empties the cache", () => {
    cacheSuggestion("key1", { explanation: "", fix: "", confidence: "low" });
    expect(getCacheSize()).toBe(1);
    clearCache();
    expect(getCacheSize()).toBe(0);
  });
});

describe("AI Cost", () => {
  test("estimateCost calculates correctly for gpt-4o-mini", () => {
    const cost = estimateCost("gpt-4o-mini", 1000, 500);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(0.01);
  });

  test("isWithinBudget returns true when under budget", () => {
    expect(isWithinBudget(100, 4000)).toBe(true);
  });

  test("isWithinBudget returns false when over budget", () => {
    expect(isWithinBudget(5000, 4000)).toBe(false);
  });

  test("estimateTokenCount gives rough estimate", () => {
    const tokens = estimateTokenCount("hello world this is a test");
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(100);
  });

  test("unknown model falls back to gpt-4o-mini pricing", () => {
    const cost = estimateCost("unknown-model", 1000, 500);
    const miniCost = estimateCost("gpt-4o-mini", 1000, 500);
    expect(cost).toBe(miniCost);
  });
});

describe("AI Suggest Fix", () => {
  test("getSurroundingLines extracts context around a line", () => {
    const content = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join("\n");
    const result = getSurroundingLines(content, 15, 3);
    expect(result).toContain("12:");
    expect(result).toContain("15:");
    expect(result).toContain("18:");
    expect(result).not.toContain("10:");
  });

  test("getSurroundingLines handles start of file", () => {
    const content = "line 1\nline 2\nline 3";
    const result = getSurroundingLines(content, 1, 5);
    expect(result).toContain("1:");
    expect(result).toContain("line 1");
  });

  test("generateFixSuggestions respects max_per_run", async () => {
    clearCache();
    const findings = Array.from({ length: 10 }, (_, i) => ({
      checkType: "lint",
      finding: { file: `file${i}.ts`, message: `Error ${i}` },
      fileContent: "",
      surroundingLines: "",
      errorDetails: "",
    }));

    const config = {
      enabled: true,
      model: "gpt-4o-mini",
      suggest_on: "fail" as const,
      max_per_run: 3,
      token_budget: 4000,
    };

    const { suggestions } = await generateFixSuggestions(findings, config);
    expect(suggestions.size).toBe(3);
  });

  test("generateFixSuggestions returns placeholders without apiCall", async () => {
    clearCache();
    const findings = [{
      checkType: "secrets",
      finding: { file: "src/config.ts", line: 14, message: "API key detected" },
      fileContent: "",
      surroundingLines: "",
      errorDetails: "",
    }];

    const config = {
      enabled: true,
      model: "gpt-4o-mini",
      suggest_on: "fail" as const,
      max_per_run: 5,
      token_budget: 4000,
    };

    const { suggestions, usage } = await generateFixSuggestions(findings, config);
    expect(suggestions.size).toBe(1);
    const suggestion = Array.from(suggestions.values())[0];
    expect(suggestion.confidence).toBe("low");
    expect(usage.total_tokens).toBe(0);
  });

  test("generateFixSuggestions uses cache for duplicate findings", async () => {
    clearCache();
    const finding = {
      checkType: "lint",
      finding: { file: "src/a.ts", message: "Missing semicolon" },
      fileContent: "",
      surroundingLines: "",
      errorDetails: "",
    };

    const config = {
      enabled: true,
      model: "gpt-4o-mini",
      suggest_on: "fail" as const,
      max_per_run: 5,
      token_budget: 4000,
    };

    // First call
    await generateFixSuggestions([finding], config);
    expect(getCacheSize()).toBe(1);

    // Second call should hit cache
    const { suggestions } = await generateFixSuggestions([finding], config);
    expect(suggestions.size).toBe(1);
  });
});
