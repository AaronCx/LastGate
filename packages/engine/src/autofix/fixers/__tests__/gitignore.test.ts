import { describe, test, expect } from "bun:test";
import { generateGitignoreUpdates } from "../gitignore";

describe("Gitignore Updater", () => {
  test("after removing .env, adds .env to .gitignore", () => {
    const { entries } = generateGitignoreUpdates("", [{ path: ".env" }]);
    expect(entries).toContain(".env");
  });

  test("after removing .DS_Store, adds .DS_Store", () => {
    const { entries } = generateGitignoreUpdates("", [{ path: ".DS_Store" }]);
    expect(entries).toContain(".DS_Store");
  });

  test("after removing node_modules/, adds node_modules/", () => {
    const { entries } = generateGitignoreUpdates("", [{ path: "node_modules/express/index.js" }]);
    expect(entries).toContain("node_modules/");
  });

  test("after removing .claude/, adds .claude/", () => {
    const { entries } = generateGitignoreUpdates("", [{ path: ".claude/settings.json" }]);
    expect(entries).toContain(".claude/");
  });

  test("after removing __pycache__/, adds __pycache__/", () => {
    const { entries } = generateGitignoreUpdates("", [{ path: "__pycache__/mod.pyc" }]);
    expect(entries).toContain("__pycache__/");
  });

  test("pattern already in .gitignore does NOT add duplicate", () => {
    const { entries } = generateGitignoreUpdates(".env\n.DS_Store\n", [
      { path: ".env" },
      { path: ".DS_Store" },
    ]);
    expect(entries.length).toBe(0);
  });

  test("existing .gitignore with other content — only new entries added", () => {
    const existing = "*.log\ndist/\n";
    const { entries, action } = generateGitignoreUpdates(existing, [{ path: ".env" }]);
    expect(entries).toContain(".env");
    expect(action).not.toBeNull();
    expect(action!.type).toBe("update_gitignore");
  });

  test("multiple patterns needed — all added", () => {
    const { entries } = generateGitignoreUpdates("", [
      { path: ".env" },
      { path: ".DS_Store" },
      { path: "node_modules/pkg/index.js" },
    ]);
    expect(entries.length).toBeGreaterThanOrEqual(3);
  });

  test("no files to add returns null action", () => {
    const { action } = generateGitignoreUpdates(".env\n", [{ path: ".env" }]);
    expect(action).toBeNull();
  });
});
