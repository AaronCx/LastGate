import { describe, test, expect } from "bun:test";
import { planAutoFixes } from "../../packages/engine/src/autofix/index";
import { isProtectedBranch, canAutoFix } from "../../packages/engine/src/autofix/safety";
import { findBlockedFiles } from "../../packages/engine/src/autofix/fixers/remove-files";
import { generateGitignoreUpdates } from "../../packages/engine/src/autofix/fixers/gitignore";
import {
  findTrailingWhitespace,
  fixTrailingWhitespace,
  findMissingEofNewline,
  fixEofNewline,
} from "../../packages/engine/src/autofix/fixers/whitespace";
import type { AutoFixConfig } from "../../packages/engine/src/autofix/types";

const defaultConfig: AutoFixConfig = {
  enabled: true,
  fixes: {
    remove_blocked_files: true,
    update_gitignore: true,
    trailing_whitespace: true,
    eof_newline: true,
    linter_autofix: false,
  },
  protected_branches: ["main", "production", "release/*"],
  require_approval: false,
};

describe("Safety Guards", () => {
  test("main is protected", () => {
    expect(isProtectedBranch("main", defaultConfig.protected_branches)).toBe(true);
  });

  test("production is protected", () => {
    expect(isProtectedBranch("production", defaultConfig.protected_branches)).toBe(true);
  });

  test("release/* matches release branches", () => {
    expect(isProtectedBranch("release/v1.0", defaultConfig.protected_branches)).toBe(true);
    expect(isProtectedBranch("release/hotfix", defaultConfig.protected_branches)).toBe(true);
  });

  test("feature branches are not protected", () => {
    expect(isProtectedBranch("feat/add-login", defaultConfig.protected_branches)).toBe(false);
    expect(isProtectedBranch("fix/bug-123", defaultConfig.protected_branches)).toBe(false);
  });

  test("canAutoFix blocks on protected branches", () => {
    const result = canAutoFix("main", defaultConfig);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("protected");
  });

  test("canAutoFix allows on feature branches", () => {
    const result = canAutoFix("feat/new-thing", defaultConfig);
    expect(result.allowed).toBe(true);
  });

  test("canAutoFix blocks when disabled", () => {
    const result = canAutoFix("feat/new", { ...defaultConfig, enabled: false });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("disabled");
  });
});

describe("Remove Files Fixer", () => {
  test("detects .env files", () => {
    const files = [{ path: ".env", status: "added" }, { path: ".env.production", status: "added" }];
    const actions = findBlockedFiles(files);
    expect(actions).toHaveLength(2);
    expect(actions.every((a) => a.type === "remove_file")).toBe(true);
  });

  test("detects .DS_Store", () => {
    const actions = findBlockedFiles([{ path: ".DS_Store", status: "added" }]);
    expect(actions).toHaveLength(1);
  });

  test("detects node_modules", () => {
    const actions = findBlockedFiles([{ path: "node_modules/lodash/index.js", status: "added" }]);
    expect(actions).toHaveLength(1);
  });

  test("ignores deleted files", () => {
    const actions = findBlockedFiles([{ path: ".env", status: "deleted" }]);
    expect(actions).toHaveLength(0);
  });

  test("ignores normal source files", () => {
    const actions = findBlockedFiles([{ path: "src/index.ts", status: "modified" }]);
    expect(actions).toHaveLength(0);
  });
});

describe("Gitignore Fixer", () => {
  test("suggests adding entries for removed files", () => {
    const { entries, action } = generateGitignoreUpdates("", [{ path: ".env" }, { path: ".DS_Store" }]);
    expect(entries).toContain(".env");
    expect(entries).toContain(".DS_Store");
    expect(action).toBeDefined();
  });

  test("skips entries already in .gitignore", () => {
    const { entries } = generateGitignoreUpdates(".env\n.DS_Store\n", [{ path: ".env" }]);
    expect(entries).toHaveLength(0);
  });

  test("returns null action when nothing to add", () => {
    const { action } = generateGitignoreUpdates(".env\n", [{ path: ".env" }]);
    expect(action).toBeNull();
  });
});

describe("Whitespace Fixer", () => {
  test("detects trailing whitespace", () => {
    const files = [{ path: "src/a.ts", content: "hello   \nworld", status: "modified" }];
    const actions = findTrailingWhitespace(files);
    expect(actions).toHaveLength(1);
  });

  test("fixTrailingWhitespace removes trailing spaces", () => {
    const fixed = fixTrailingWhitespace("hello   \nworld  \n");
    expect(fixed).toBe("hello\nworld\n");
  });

  test("detects missing EOF newline", () => {
    const files = [{ path: "src/a.ts", content: "hello", status: "modified" }];
    const actions = findMissingEofNewline(files);
    expect(actions).toHaveLength(1);
  });

  test("fixEofNewline adds newline", () => {
    expect(fixEofNewline("hello")).toBe("hello\n");
    expect(fixEofNewline("hello\n")).toBe("hello\n");
  });

  test("empty content is not flagged", () => {
    const files = [{ path: "src/a.ts", content: "", status: "modified" }];
    expect(findMissingEofNewline(files)).toHaveLength(0);
    expect(findTrailingWhitespace(files)).toHaveLength(0);
  });
});

describe("Plan Auto Fixes", () => {
  test("plans fixes for blocked files on feature branch", () => {
    const files = [
      { path: ".env", content: "SECRET=abc", status: "added" },
      { path: "src/index.ts", content: "export {}", status: "modified" },
    ];
    const result = planAutoFixes(files, "feat/new", defaultConfig);
    expect(result.applied.length).toBeGreaterThan(0);
    expect(result.error).toBeUndefined();
  });

  test("returns error for protected branch", () => {
    const files = [{ path: ".env", content: "SECRET=abc", status: "added" }];
    const result = planAutoFixes(files, "main", defaultConfig);
    expect(result.applied).toHaveLength(0);
    expect(result.error).toContain("protected");
  });

  test("empty file list produces no actions", () => {
    const result = planAutoFixes([], "feat/new", defaultConfig);
    expect(result.applied).toHaveLength(0);
  });
});
