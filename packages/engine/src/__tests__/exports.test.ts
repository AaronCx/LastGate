import { describe, test, expect } from "bun:test";
import * as engine from "../index";

describe("Engine public exports", () => {
  test("runCheckPipeline is exported as a function", () => {
    expect(engine.runCheckPipeline).toBeDefined();
    expect(typeof engine.runCheckPipeline).toBe("function");
  });

  test("parseConfig is exported as a function", () => {
    expect(engine.parseConfig).toBeDefined();
    expect(typeof engine.parseConfig).toBe("function");
  });

  test("no unexpected runtime exports exist", () => {
    // Only runtime (non-type) exports should be runCheckPipeline and parseConfig
    const runtimeKeys = Object.keys(engine);
    expect(runtimeKeys).toContain("runCheckPipeline");
    expect(runtimeKeys).toContain("parseConfig");
    // Types are erased at runtime, so only the two functions should be present
    expect(runtimeKeys.length).toBe(2);
  });
});

describe("Engine type exports compile correctly", () => {
  // These tests verify that the type exports resolve at compile time.
  // If any type were missing from index.ts, this file would fail to compile.

  test("CheckResult type is usable", () => {
    const result: engine.CheckResult = {
      type: "secrets",
      status: "pass",
      title: "test",
      details: {},
    };
    expect(result.type).toBe("secrets");
  });

  test("CheckRunResults type is usable", () => {
    const results: engine.CheckRunResults = {
      checks: [],
      hasFailures: false,
      hasWarnings: false,
      failureCount: 0,
      warningCount: 0,
      summary: "",
      annotations: [],
    };
    expect(results.checks).toEqual([]);
  });

  test("PipelineConfig type is usable", () => {
    const config: engine.PipelineConfig = {
      checks: {
        secrets: { enabled: true, severity: "fail" },
      },
    };
    expect(config.checks.secrets!.enabled).toBe(true);
  });

  test("ChangedFile type is usable", () => {
    const f: engine.ChangedFile = {
      path: "src/index.ts",
      content: "const x = 1;",
      status: "added",
    };
    expect(f.status).toBe("added");
  });

  test("CommitInfo type is usable", () => {
    const c: engine.CommitInfo = {
      sha: "abc1234",
      message: "feat: test",
      author: "dev",
      timestamp: new Date().toISOString(),
    };
    expect(c.sha).toBe("abc1234");
  });

  test("CheckStatus type accepts valid values", () => {
    const pass: engine.CheckStatus = "pass";
    const warn: engine.CheckStatus = "warn";
    const fail: engine.CheckStatus = "fail";
    expect([pass, warn, fail]).toEqual(["pass", "warn", "fail"]);
  });

  test("CheckType type accepts all valid check types", () => {
    const types: engine.CheckType[] = [
      "secrets",
      "duplicates",
      "lint",
      "build",
      "dependencies",
      "file_patterns",
      "commit_message",
      "agent_patterns",
    ];
    expect(types.length).toBe(8);
  });

  test("Annotation type is usable", () => {
    const a: engine.Annotation = {
      path: "src/index.ts",
      start_line: 1,
      end_line: 1,
      annotation_level: "failure",
      message: "Found a secret",
      title: "secrets: AWS Key",
    };
    expect(a.annotation_level).toBe("failure");
  });

  test("PipelineInput type is usable", () => {
    const input: engine.PipelineInput = {
      files: [],
      commits: [],
      branch: "main",
      repoFullName: "test/repo",
    };
    expect(input.branch).toBe("main");
  });
});
