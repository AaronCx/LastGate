import { describe, test, expect } from "bun:test";
import { getSurroundingLines, generateFixSuggestions } from "../suggest-fix";
import { clearCache } from "../cache";
import type { AiSuggestionsConfig, FixSuggestionRequest } from "../types";

const defaultConfig: AiSuggestionsConfig = {
  enabled: true,
  model: "gpt-4o-mini",
  suggest_on: "fail",
  max_per_run: 5,
  token_budget: 10000,
};

describe("Suggestion Generator", () => {
  // Surrounding lines
  test("getSurroundingLines extracts correct range", () => {
    const content = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join("\n");
    const result = getSurroundingLines(content, 15, 5);
    expect(result).toContain("10:");
    expect(result).toContain("20:");
    // Line 9 should not be present (context=5 means lines 10-20 for line 15)
    expect(result).not.toContain("9: line 9");
  });

  test("line 1 issue starts from line 1 (no negative indices)", () => {
    const content = "first\nsecond\nthird";
    const result = getSurroundingLines(content, 1, 10);
    expect(result).toContain("1:");
    expect(result).toContain("first");
  });

  test("last line issue goes to end of file", () => {
    const content = "a\nb\nc";
    const result = getSurroundingLines(content, 3, 10);
    expect(result).toContain("c");
  });

  test("file with fewer lines than context includes all available", () => {
    const content = "only\ntwo\nlines";
    const result = getSurroundingLines(content, 2, 10);
    expect(result).toContain("only");
    expect(result).toContain("lines");
  });

  // generateFixSuggestions
  test("generates suggestions using API call", async () => {
    clearCache();
    const findings: FixSuggestionRequest[] = [
      {
        checkType: "secrets",
        finding: { file: "src/config.ts", line: 5, message: "API key detected" },
        fileContent: 'const key = "sk_test_123";',
        surroundingLines: '5: const key = "sk_test_123";',
        errorDetails: "Possible API key in source",
      },
    ];

    const mockApiCall = async () => ({
      text: "Move the key to an environment variable.\n```\nconst key = process.env.API_KEY;\n```",
      promptTokens: 100,
      completionTokens: 50,
    });

    const { suggestions, usage } = await generateFixSuggestions(findings, defaultConfig, mockApiCall);
    expect(suggestions.size).toBe(1);
    expect(usage.total_tokens).toBe(150);
    expect(usage.prompt_tokens).toBe(100);
    expect(usage.completion_tokens).toBe(50);
  });

  test("cached suggestions skip API call", async () => {
    clearCache();
    const findings: FixSuggestionRequest[] = [
      {
        checkType: "lint",
        finding: { file: "src/a.ts", line: 1, message: "Unused var" },
        fileContent: "const x = 1;",
        surroundingLines: "1: const x = 1;",
        errorDetails: "no-unused-vars",
      },
    ];

    let callCount = 0;
    const mockApiCall = async () => {
      callCount++;
      return { text: "Remove the unused variable.", promptTokens: 50, completionTokens: 20 };
    };

    // First call
    await generateFixSuggestions(findings, defaultConfig, mockApiCall);
    expect(callCount).toBe(1);

    // Second call — should use cache
    await generateFixSuggestions(findings, defaultConfig, mockApiCall);
    expect(callCount).toBe(1); // No additional call
  });

  test("max_per_run limits suggestions", async () => {
    clearCache();
    const findings: FixSuggestionRequest[] = Array.from({ length: 10 }, (_, i) => ({
      checkType: "lint",
      finding: { file: `src/file${i}.ts`, line: 1, message: `Error ${i}` },
      fileContent: "code",
      surroundingLines: "1: code",
      errorDetails: "error",
    }));

    let callCount = 0;
    const mockApiCall = async () => {
      callCount++;
      return { text: "Fix it.", promptTokens: 50, completionTokens: 20 };
    };

    const config = { ...defaultConfig, max_per_run: 3 };
    await generateFixSuggestions(findings, config, mockApiCall);
    expect(callCount).toBe(3);
  });

  test("budget exceeded stops generating suggestions", async () => {
    clearCache();
    const findings: FixSuggestionRequest[] = Array.from({ length: 5 }, (_, i) => ({
      checkType: "build",
      finding: { file: `src/f${i}.ts`, line: 1, message: `Build error ${i}` },
      fileContent: "code",
      surroundingLines: "1: code",
      errorDetails: "error",
    }));

    const mockApiCall = async () => ({
      text: "Fix the build.",
      promptTokens: 3000,
      completionTokens: 2000,
    });

    const config = { ...defaultConfig, token_budget: 4000, max_per_run: 10 };
    const { suggestions } = await generateFixSuggestions(findings, config, mockApiCall);
    // Should stop after first call since 5000 > 4000 budget
    expect(suggestions.size).toBeLessThanOrEqual(2);
  });

  test("no API call function creates placeholder suggestions", async () => {
    clearCache();
    const findings: FixSuggestionRequest[] = [
      {
        checkType: "secrets",
        finding: { file: "src/x.ts", line: 1, message: "Secret found" },
        fileContent: "code",
        surroundingLines: "1: code",
        errorDetails: "secret",
      },
    ];

    const { suggestions } = await generateFixSuggestions(findings, defaultConfig);
    expect(suggestions.size).toBe(1);
    const suggestion = Array.from(suggestions.values())[0];
    expect(suggestion.confidence).toBe("low");
  });
});
