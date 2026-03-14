import { describe, test, expect } from "bun:test";
import { planAutoFixes } from "../index";
import type { AutoFixConfig } from "../types";

const defaultConfig: AutoFixConfig = {
  enabled: true,
  fixes: {
    remove_blocked_files: true,
    update_gitignore: true,
    trailing_whitespace: true,
    eof_newline: true,
    linter_autofix: false,
  },
  protected_branches: ["main", "production"],
  require_approval: false,
};

describe("Auto-Fix Plan Orchestrator", () => {
  test("protected branch returns error", () => {
    const result = planAutoFixes([], "main", defaultConfig);
    expect(result.error).toBeDefined();
    expect(result.applied.length).toBe(0);
  });

  test("feature branch with blocked files plans removal", () => {
    const files = [
      { path: ".env", content: "SECRET=123", status: "added" },
      { path: "src/index.ts", content: "code\n", status: "modified" },
    ];
    const result = planAutoFixes(files, "feature/x", defaultConfig);
    expect(result.applied.some((a) => a.type === "remove_file")).toBe(true);
  });

  test("blocked file removal triggers gitignore update", () => {
    const files = [{ path: ".env", content: "SECRET=123", status: "added" }];
    const result = planAutoFixes(files, "feature/x", defaultConfig, "");
    expect(result.applied.some((a) => a.type === "update_gitignore")).toBe(true);
  });

  test("trailing whitespace is detected in plan", () => {
    const files = [{ path: "src/a.ts", content: "line  \nline2\n", status: "modified" }];
    const result = planAutoFixes(files, "feature/x", defaultConfig);
    expect(result.applied.some((a) => a.type === "fix_whitespace")).toBe(true);
  });

  test("missing EOF newline is detected in plan", () => {
    const files = [{ path: "src/b.ts", content: "no newline at end", status: "modified" }];
    const result = planAutoFixes(files, "feature/x", defaultConfig);
    expect(result.applied.some((a) => a.type === "fix_eof")).toBe(true);
  });

  test("disabled config returns error", () => {
    const config = { ...defaultConfig, enabled: false };
    const result = planAutoFixes([], "feature/x", config);
    expect(result.error).toBeDefined();
  });

  test("disabled individual fixers skip those fixes", () => {
    const config: AutoFixConfig = {
      ...defaultConfig,
      fixes: {
        remove_blocked_files: false,
        update_gitignore: false,
        trailing_whitespace: false,
        eof_newline: false,
        linter_autofix: false,
      },
    };
    const files = [
      { path: ".env", content: "SECRET=123", status: "added" },
      { path: "src/a.ts", content: "line  \n", status: "modified" },
    ];
    const result = planAutoFixes(files, "feature/x", config);
    expect(result.applied.length).toBe(0);
  });

  test("clean files produce no fixes", () => {
    const files = [{ path: "src/index.ts", content: "clean code\n", status: "modified" }];
    const result = planAutoFixes(files, "feature/x", defaultConfig);
    expect(result.applied.length).toBe(0);
  });
});
