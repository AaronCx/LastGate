import { describe, test, expect } from "bun:test";
import { isProtectedBranch, canAutoFix } from "../safety";
import type { AutoFixConfig } from "../types";

const defaultConfig: AutoFixConfig = {
  enabled: true,
  fixes: {
    remove_blocked_files: true,
    update_gitignore: true,
    trailing_whitespace: true,
    eof_newline: true,
    linter_autofix: true,
  },
  protected_branches: ["main", "production", "release/*"],
  require_approval: false,
};

describe("Auto-Fix Safety Guards", () => {
  // Protected branches
  test("push to main — auto-fix NEVER runs", () => {
    expect(isProtectedBranch("main", defaultConfig.protected_branches)).toBe(true);
    expect(canAutoFix("main", defaultConfig).allowed).toBe(false);
  });

  test("push to production — auto-fix NEVER runs", () => {
    expect(isProtectedBranch("production", defaultConfig.protected_branches)).toBe(true);
  });

  test("push to release/v1.0 — matches release/* glob", () => {
    expect(isProtectedBranch("release/v1.0", defaultConfig.protected_branches)).toBe(true);
  });

  test("push to feature/add-auth — auto-fix runs if enabled", () => {
    expect(isProtectedBranch("feature/add-auth", defaultConfig.protected_branches)).toBe(false);
    expect(canAutoFix("feature/add-auth", defaultConfig).allowed).toBe(true);
  });

  test("push to fix/bug-123 — auto-fix runs if enabled", () => {
    expect(isProtectedBranch("fix/bug-123", defaultConfig.protected_branches)).toBe(false);
    expect(canAutoFix("fix/bug-123", defaultConfig).allowed).toBe(true);
  });

  test("custom protected branches are respected", () => {
    const config = { ...defaultConfig, protected_branches: ["main", "staging", "deploy/*"] };
    expect(isProtectedBranch("staging", config.protected_branches)).toBe(true);
    expect(isProtectedBranch("deploy/prod", config.protected_branches)).toBe(true);
    expect(isProtectedBranch("feature/x", config.protected_branches)).toBe(false);
  });

  // Disabled
  test("auto-fix disabled in config — never runs", () => {
    const config = { ...defaultConfig, enabled: false };
    const result = canAutoFix("feature/x", config);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("disabled");
  });

  // canAutoFix provides reason
  test("canAutoFix provides reason for protected branch", () => {
    const result = canAutoFix("main", defaultConfig);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("protected");
  });
});
