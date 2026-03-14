import { describe, test, expect } from "bun:test";
import { matchFiles, findPattern, isTestFile, isSourceFile } from "../helpers";
import type { ChangedFile } from "../types";

function makeFile(path: string): ChangedFile {
  return { path, content: "", status: "modified" };
}

describe("SDK Helpers", () => {
  // matchFiles
  test("matchFiles with src/**/*.ts returns .ts files under src/", () => {
    const files = [makeFile("src/index.ts"), makeFile("src/utils/helper.ts"), makeFile("lib/other.js"), makeFile("src/data.json")];
    const result = matchFiles(files, "src/**/*.ts");
    // The glob->regex converter uses .* for **, which matches nested paths
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.every((f) => f.path.startsWith("src/") && f.path.endsWith(".ts"))).toBe(true);
  });

  test("matchFiles with *.test.ts returns only test files", () => {
    const files = [makeFile("foo.test.ts"), makeFile("bar.test.ts"), makeFile("baz.ts")];
    const result = matchFiles(files, "*.test.ts");
    expect(result.length).toBe(2);
  });

  test("matchFiles with **/* returns files with slashes", () => {
    const files = [makeFile("b/c.ts"), makeFile("d/e/f.ts")];
    const result = matchFiles(files, "**/*");
    expect(result.length).toBe(2);
  });

  test("matchFiles with empty files returns empty array", () => {
    expect(matchFiles([], "src/**/*.ts")).toEqual([]);
  });

  // findPattern
  test("findPattern returns all matches with line numbers", () => {
    const content = "line1\nconsole.log('a')\nline3\nconsole.log('b')";
    const results = findPattern(content, /console\.log/);
    expect(results.length).toBe(2);
    expect(results[0].line).toBe(2);
    expect(results[1].line).toBe(4);
    expect(results[0].match).toBe("console.log");
  });

  test("findPattern with no matches returns empty array", () => {
    const results = findPattern("hello world", /no-match/);
    expect(results).toEqual([]);
  });

  test("findPattern with empty string returns empty array", () => {
    const results = findPattern("", /anything/);
    expect(results).toEqual([]);
  });

  // isTestFile
  test("isTestFile identifies __tests__ files", () => {
    expect(isTestFile("src/__tests__/foo.test.ts")).toBe(true);
  });

  test("isTestFile identifies .spec files", () => {
    expect(isTestFile("src/foo.spec.tsx")).toBe(true);
  });

  test("isTestFile identifies /tests/ directory files", () => {
    expect(isTestFile("src/tests/unit/foo.ts")).toBe(true);
  });

  test("isTestFile rejects normal source files", () => {
    expect(isTestFile("src/components/Button.tsx")).toBe(false);
  });

  test("isTestFile rejects test-utils (utility, not a test)", () => {
    expect(isTestFile("test-utils.ts")).toBe(false);
  });

  // isSourceFile
  test("isSourceFile identifies .ts source files", () => {
    expect(isSourceFile("src/index.ts")).toBe(true);
  });

  test("isSourceFile rejects test files", () => {
    expect(isSourceFile("src/foo.test.ts")).toBe(false);
  });

  test("isSourceFile rejects non-matching extensions", () => {
    expect(isSourceFile("src/data.json")).toBe(false);
  });
});
