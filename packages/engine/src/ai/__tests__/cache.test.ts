import { describe, test, expect } from "bun:test";
import { getCacheKey, getCachedSuggestion, cacheSuggestion, clearCache, getCacheSize } from "../cache";
import type { FixSuggestion } from "../types";

describe("Suggestion Cache", () => {
  const testSuggestion: FixSuggestion = {
    explanation: "Move to env var",
    fix: "process.env.API_KEY",
    confidence: "high",
  };

  test("same file + same error returns cached suggestion", () => {
    clearCache();
    const key = getCacheKey("secrets", "src/config.ts", "API key detected");
    cacheSuggestion(key, testSuggestion);
    const cached = getCachedSuggestion(key);
    expect(cached).toEqual(testSuggestion);
  });

  test("same file + same error on different line is same cache key (line not in key)", () => {
    clearCache();
    // Cache key is based on checkType + file + message, not line
    const key1 = getCacheKey("secrets", "src/config.ts", "API key detected");
    const key2 = getCacheKey("secrets", "src/config.ts", "API key detected");
    expect(key1).toBe(key2);
  });

  test("same error + different file is cache miss", () => {
    clearCache();
    const key1 = getCacheKey("secrets", "src/config.ts", "API key detected");
    const key2 = getCacheKey("secrets", "src/other.ts", "API key detected");
    expect(key1).not.toBe(key2);
  });

  test("cache key includes check type", () => {
    const key1 = getCacheKey("secrets", "src/a.ts", "error");
    const key2 = getCacheKey("lint", "src/a.ts", "error");
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
    const key1 = getCacheKey("lint", "src/a.ts", "unused var");
    const key2 = getCacheKey("lint", "src/a.ts", "unused var");
    expect(key1).toBe(key2);
    expect(key1.length).toBe(16); // 16 hex chars
  });
});
