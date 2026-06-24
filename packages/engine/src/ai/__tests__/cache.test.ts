import { describe, test, expect } from "bun:test";
import { getCacheKey, getCachedSuggestion, cacheSuggestion, clearCache, getCacheSize } from "../cache";
import type { FixSuggestion } from "../types";

describe("Suggestion Cache", () => {
  const testSuggestion: FixSuggestion = {
    explanation: "Move to env var",
    fix: "process.env.API_KEY",
    confidence: "high",
  };

  test("same file + same line + same error returns cached suggestion", () => {
    clearCache();
    const key = getCacheKey("secrets", "src/config.ts", 10, "API key detected");
    cacheSuggestion(key, testSuggestion);
    const cached = getCachedSuggestion(key);
    expect(cached).toEqual(testSuggestion);
  });

  test("same file + same error on a DIFFERENT line is now a different key (no bleed)", () => {
    clearCache();
    const key1 = getCacheKey("secrets", "src/config.ts", 10, "API key detected");
    const key2 = getCacheKey("secrets", "src/config.ts", 42, "API key detected");
    expect(key1).not.toBe(key2);
  });

  test("same error + different file is cache miss", () => {
    clearCache();
    const key1 = getCacheKey("secrets", "src/config.ts", 10, "API key detected");
    const key2 = getCacheKey("secrets", "src/other.ts", 10, "API key detected");
    expect(key1).not.toBe(key2);
  });

  test("cache key includes check type", () => {
    const key1 = getCacheKey("secrets", "src/a.ts", 1, "error");
    const key2 = getCacheKey("lint", "src/a.ts", 1, "error");
    expect(key1).not.toBe(key2);
  });

  test("cache miss returns null", () => {
    clearCache();
    expect(getCachedSuggestion("nonexistent-key")).toBeNull();
  });

  test("clearCache empties the cache", () => {
    cacheSuggestion("test-key", testSuggestion);
    expect(getCacheSize()).toBeGreaterThan(0);
    clearCache();
    expect(getCacheSize()).toBe(0);
  });

  test("cache key is deterministic (SHA-256 based)", () => {
    const key1 = getCacheKey("lint", "src/a.ts", 5, "unused var");
    const key2 = getCacheKey("lint", "src/a.ts", 5, "unused var");
    expect(key1).toBe(key2);
    expect(key1.length).toBe(16); // 16 hex chars
  });
});
