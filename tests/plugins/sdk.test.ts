import { describe, test, expect } from "bun:test";
import { matchFiles, findPattern, isTestFile, isSourceFile } from "../../packages/sdk/src/helpers";
import type { ChangedFile, CustomCheck } from "../../packages/sdk/src/types";

const mockFiles: ChangedFile[] = [
  { path: "src/index.ts", content: "export default {}", status: "modified" },
  { path: "src/utils/helpers.ts", content: "export const a = 1;", status: "added" },
  { path: "src/__tests__/index.test.ts", content: "test('a', () => {})", status: "modified" },
  { path: "README.md", content: "# Hello", status: "modified" },
  { path: "src/components/Button.tsx", content: "<button/>", status: "added" },
];

describe("SDK Helpers", () => {
  test("matchFiles with simple extension glob", () => {
    const result = matchFiles(mockFiles, "**/*.ts");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((f) => f.path.endsWith(".ts"))).toBe(true);
  });

  test("matchFiles with directory glob", () => {
    const result = matchFiles(mockFiles, "src/**/*.ts");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((f) => f.path.startsWith("src/"))).toBe(true);
  });

  test("matchFiles with tsx files", () => {
    const result = matchFiles(mockFiles, "**/*.tsx");
    expect(result).toHaveLength(1);
    expect(result[0].path).toContain("Button");
  });

  test("matchFiles returns empty for no matches", () => {
    const result = matchFiles(mockFiles, "**/*.py");
    expect(result).toHaveLength(0);
  });

  test("findPattern finds regex matches with line numbers", () => {
    const content = "line one\nconst x = console.log('hi');\nline three";
    const results = findPattern(content, /console\.log/);
    expect(results).toHaveLength(1);
    expect(results[0].line).toBe(2);
    expect(results[0].match).toBe("console.log");
  });

  test("findPattern returns empty for no matches", () => {
    const results = findPattern("no matches here", /foobar/);
    expect(results).toHaveLength(0);
  });

  test("isTestFile identifies test files", () => {
    expect(isTestFile("src/__tests__/foo.test.ts")).toBe(true);
    expect(isTestFile("src/foo.spec.ts")).toBe(true);
    expect(isTestFile("src/tests/unit/bar.ts")).toBe(true);
    expect(isTestFile("src/test/integration.ts")).toBe(true);
  });

  test("isTestFile rejects non-test files", () => {
    expect(isTestFile("src/index.ts")).toBe(false);
    expect(isTestFile("src/components/Button.tsx")).toBe(false);
  });

  test("isSourceFile identifies source files", () => {
    expect(isSourceFile("src/index.ts")).toBe(true);
    expect(isSourceFile("src/App.tsx")).toBe(true);
    expect(isSourceFile("lib/helpers.js")).toBe(true);
  });

  test("isSourceFile rejects test files", () => {
    expect(isSourceFile("src/__tests__/foo.test.ts")).toBe(false);
  });

  test("isSourceFile rejects non-code files", () => {
    expect(isSourceFile("README.md")).toBe(false);
    expect(isSourceFile("package.json")).toBe(false);
  });
});

describe("SDK Types", () => {
  test("CustomCheck interface is implementable", () => {
    const check: CustomCheck = {
      name: "test-check",
      description: "A test check",
      severity: "warn",
      async run(files, context) {
        return { status: "pass", title: "All good" };
      },
    };
    expect(check.name).toBe("test-check");
    expect(check.severity).toBe("warn");
  });

  test("CustomCheck can return findings", async () => {
    const check: CustomCheck = {
      name: "console-check",
      description: "Check for console.log",
      severity: "fail",
      async run(files) {
        return {
          status: "fail",
          title: "Found console.log",
          findings: [{ file: "src/index.ts", line: 5, message: "Remove console.log" }],
        };
      },
    };
    const result = await check.run([], { repoFullName: "", branch: "", commitSha: "", commitMessage: "", commitAuthor: "", config: {} });
    expect(result.status).toBe("fail");
    expect(result.findings).toHaveLength(1);
    expect(result.findings![0].file).toBe("src/index.ts");
  });
});
