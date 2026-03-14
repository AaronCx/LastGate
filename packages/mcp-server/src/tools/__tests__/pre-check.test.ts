import { describe, test, expect } from "bun:test";
import { PRE_CHECK_TOOL, formatPreCheckResult } from "../pre-check";

describe("lastgate_pre_check Tool", () => {
  test("tool name is correct", () => {
    expect(PRE_CHECK_TOOL.name).toBe("lastgate_pre_check");
  });

  test("files is required", () => {
    expect(PRE_CHECK_TOOL.inputSchema.required).toContain("files");
  });

  test("clean files return all pass message", () => {
    const result = formatPreCheckResult([
      { type: "secrets", status: "pass", title: "No secrets" },
      { type: "lint", status: "pass", title: "No lint issues" },
    ]);
    expect(result.content[0].text).toContain("Safe to commit");
  });

  test("failures return fix message with details", () => {
    const result = formatPreCheckResult([
      {
        type: "secrets",
        status: "fail",
        title: "Secret found",
        details: {
          findings: [{ file: "src/config.ts", line: 12, message: "API key" }],
        },
      },
    ]);
    expect(result.content[0].text).toContain("FAIL");
    expect(result.content[0].text).toContain("src/config.ts:12");
    expect(result.content[0].text).toContain("Fix these issues");
  });

  test("warnings are listed separately", () => {
    const result = formatPreCheckResult([
      { type: "commit_message", status: "warn", title: "Generic message" },
    ]);
    expect(result.content[0].text).toContain("warning");
    expect(result.content[0].text).toContain("commit_message");
  });

  test("multiple failures grouped by check type", () => {
    const result = formatPreCheckResult([
      {
        type: "secrets",
        status: "fail",
        title: "Secret 1",
        details: { findings: [{ file: "a.ts", line: 1, message: "key" }] },
      },
      {
        type: "lint",
        status: "fail",
        title: "Lint error",
        details: { findings: [{ file: "b.ts", line: 2, message: "unused" }] },
      },
    ]);
    expect(result.content[0].text).toContain("SECRETS");
    expect(result.content[0].text).toContain("LINT");
    expect(result.content[0].text).toContain("2 check(s) would FAIL");
  });

  test("response format is content array with text type", () => {
    const result = formatPreCheckResult([]);
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe("text");
  });

  test("empty checks return safe to commit", () => {
    const result = formatPreCheckResult([]);
    expect(result.content[0].text).toContain("Safe to commit");
  });

  test("findings without line numbers handled", () => {
    const result = formatPreCheckResult([
      {
        type: "build",
        status: "fail",
        title: "Build failed",
        details: { findings: [{ file: "package.json", message: "Build error" }] },
      },
    ]);
    expect(result.content[0].text).toContain("package.json");
    expect(result.content[0].text).not.toContain("undefined");
  });
});
