import { describe, test, expect } from "bun:test";
import { PRE_CHECK_TOOL, formatPreCheckResult } from "../pre-check";

describe("lastgate_pre_check Tool", () => {
  describe("schema definition", () => {
    test("tool name is correct", () => {
      expect(PRE_CHECK_TOOL.name).toBe("lastgate_pre_check");
    });

    test("has a description", () => {
      expect(PRE_CHECK_TOOL.description).toBeDefined();
      expect(PRE_CHECK_TOOL.description.length).toBeGreaterThan(10);
    });

    test("inputSchema type is object", () => {
      expect(PRE_CHECK_TOOL.inputSchema.type).toBe("object");
    });

    test("files is required", () => {
      expect(PRE_CHECK_TOOL.inputSchema.required).toContain("files");
    });

    test("files is the only required field", () => {
      expect(PRE_CHECK_TOOL.inputSchema.required).toEqual(["files"]);
    });

    test("files property is an array type", () => {
      expect(PRE_CHECK_TOOL.inputSchema.properties.files.type).toBe("array");
    });

    test("files items have path, content, status properties", () => {
      const itemProps = PRE_CHECK_TOOL.inputSchema.properties.files.items.properties;
      expect(itemProps.path).toBeDefined();
      expect(itemProps.content).toBeDefined();
      expect(itemProps.status).toBeDefined();
    });

    test("status enum includes added, modified, deleted", () => {
      const statusEnum = PRE_CHECK_TOOL.inputSchema.properties.files.items.properties.status.enum;
      expect(statusEnum).toContain("added");
      expect(statusEnum).toContain("modified");
      expect(statusEnum).toContain("deleted");
    });

    test("diff param is defined with string type", () => {
      const diff = PRE_CHECK_TOOL.inputSchema.properties.diff;
      expect(diff).toBeDefined();
      expect(diff.type).toBe("string");
    });

    test("diff param has a description", () => {
      expect(PRE_CHECK_TOOL.inputSchema.properties.diff.description).toBeDefined();
      expect(PRE_CHECK_TOOL.inputSchema.properties.diff.description.length).toBeGreaterThan(0);
    });

    test("branch param is defined with string type", () => {
      const branch = PRE_CHECK_TOOL.inputSchema.properties.branch;
      expect(branch).toBeDefined();
      expect(branch.type).toBe("string");
    });

    test("config_path param is defined with string type", () => {
      const configPath = PRE_CHECK_TOOL.inputSchema.properties.config_path;
      expect(configPath).toBeDefined();
      expect(configPath.type).toBe("string");
    });

    test("commit_message param is defined with string type", () => {
      expect(PRE_CHECK_TOOL.inputSchema.properties.commit_message.type).toBe("string");
    });

    test("repo param is defined with string type", () => {
      expect(PRE_CHECK_TOOL.inputSchema.properties.repo.type).toBe("string");
    });

    test("diff, branch, config_path are not required", () => {
      const required = PRE_CHECK_TOOL.inputSchema.required;
      expect(required).not.toContain("diff");
      expect(required).not.toContain("branch");
      expect(required).not.toContain("config_path");
    });
  });

  describe("formatPreCheckResult — all passing", () => {
    test("clean files return all pass message", () => {
      const result = formatPreCheckResult([
        { type: "secrets", status: "pass", title: "No secrets" },
        { type: "lint", status: "pass", title: "No lint issues" },
      ]);
      expect(result.content[0].text).toContain("Safe to commit");
    });

    test("empty checks return safe to commit", () => {
      const result = formatPreCheckResult([]);
      expect(result.content[0].text).toContain("Safe to commit");
    });

    test("single passing check returns safe to commit", () => {
      const result = formatPreCheckResult([
        { type: "secrets", status: "pass", title: "No secrets detected" },
      ]);
      expect(result.content[0].text).toContain("Safe to commit");
    });
  });

  describe("formatPreCheckResult — failures", () => {
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

    test("failure count is accurate", () => {
      const result = formatPreCheckResult([
        { type: "a", status: "fail", title: "A failed" },
        { type: "b", status: "fail", title: "B failed" },
        { type: "c", status: "fail", title: "C failed" },
      ]);
      expect(result.content[0].text).toContain("3 check(s) would FAIL");
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

    test("findings without line numbers handled gracefully", () => {
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
      // Should NOT contain ":undefined" or "package.json:" followed by nothing meaningful
      expect(result.content[0].text).toContain("package.json —");
    });

    test("failure with empty findings array", () => {
      const result = formatPreCheckResult([
        {
          type: "custom",
          status: "fail",
          title: "Custom check failed",
          details: { findings: [] },
        },
      ]);
      expect(result.content[0].text).toContain("CUSTOM");
      expect(result.content[0].text).toContain("Custom check failed");
      expect(result.content[0].text).toContain("Fix these issues");
    });

    test("failure with no details object", () => {
      const result = formatPreCheckResult([
        { type: "test", status: "fail", title: "Tests failed" },
      ]);
      expect(result.content[0].text).toContain("TEST");
      expect(result.content[0].text).toContain("Tests failed");
      expect(result.content[0].text).toContain("Fix these issues");
    });

    test("failure with details but no findings key", () => {
      const result = formatPreCheckResult([
        { type: "deploy", status: "fail", title: "Deploy blocked", details: {} },
      ]);
      expect(result.content[0].text).toContain("DEPLOY");
      expect(result.content[0].text).toContain("Deploy blocked");
    });

    test("multiple findings in a single check", () => {
      const result = formatPreCheckResult([
        {
          type: "secrets",
          status: "fail",
          title: "Multiple secrets found",
          details: {
            findings: [
              { file: "env.ts", line: 5, message: "AWS key" },
              { file: "env.ts", line: 10, message: "DB password" },
              { file: "config.json", line: 1, message: "Token" },
            ],
          },
        },
      ]);
      const text = result.content[0].text;
      expect(text).toContain("env.ts:5");
      expect(text).toContain("env.ts:10");
      expect(text).toContain("config.json:1");
      expect(text).toContain("AWS key");
      expect(text).toContain("DB password");
      expect(text).toContain("Token");
    });
  });

  describe("formatPreCheckResult — warnings", () => {
    test("warnings are listed separately", () => {
      const result = formatPreCheckResult([
        { type: "commit_message", status: "warn", title: "Generic message" },
      ]);
      expect(result.content[0].text).toContain("warning");
      expect(result.content[0].text).toContain("commit_message");
    });

    test("warning count is accurate", () => {
      const result = formatPreCheckResult([
        { type: "a", status: "warn", title: "Warning A" },
        { type: "b", status: "warn", title: "Warning B" },
      ]);
      expect(result.content[0].text).toContain("2 warning(s)");
    });

    test("warnings include fix message", () => {
      const result = formatPreCheckResult([
        { type: "style", status: "warn", title: "Code style" },
      ]);
      expect(result.content[0].text).toContain("Fix these issues");
    });

    test("warning title is rendered in bold", () => {
      const result = formatPreCheckResult([
        { type: "perf", status: "warn", title: "Performance concern" },
      ]);
      expect(result.content[0].text).toContain("**perf**");
    });
  });

  describe("formatPreCheckResult — mixed statuses", () => {
    test("failures and warnings together", () => {
      const result = formatPreCheckResult([
        {
          type: "secrets",
          status: "fail",
          title: "Secret found",
          details: { findings: [{ file: "a.ts", line: 1, message: "key" }] },
        },
        { type: "commit_message", status: "warn", title: "Short message" },
        { type: "lint", status: "pass", title: "No issues" },
      ]);
      const text = result.content[0].text;
      expect(text).toContain("1 check(s) would FAIL");
      expect(text).toContain("1 warning(s)");
      expect(text).toContain("Fix these issues");
      // Pass checks should not appear in output
      expect(text).not.toContain("No issues");
    });

    test("passing checks are not listed in failure/warning output", () => {
      const result = formatPreCheckResult([
        { type: "secrets", status: "pass", title: "Clean" },
        { type: "lint", status: "fail", title: "Lint error" },
      ]);
      const text = result.content[0].text;
      expect(text).not.toContain("Clean");
      expect(text).toContain("Lint error");
    });
  });

  describe("formatPreCheckResult — output format", () => {
    test("response format is content array with text type", () => {
      const result = formatPreCheckResult([]);
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBe(1);
      expect(result.content[0].type).toBe("text");
    });

    test("check type is uppercased in heading", () => {
      const result = formatPreCheckResult([
        { type: "file_size", status: "fail", title: "Too large" },
      ]);
      expect(result.content[0].text).toContain("### FILE_SIZE");
    });

    test("heading uses ### markdown format", () => {
      const result = formatPreCheckResult([
        { type: "secrets", status: "fail", title: "Found" },
      ]);
      expect(result.content[0].text).toContain("### SECRETS");
    });

    test("findings are prefixed with dash", () => {
      const result = formatPreCheckResult([
        {
          type: "secrets",
          status: "fail",
          title: "Found",
          details: { findings: [{ file: "x.ts", line: 1, message: "key" }] },
        },
      ]);
      expect(result.content[0].text).toContain("- x.ts:1");
    });
  });
});
