import { describe, test, expect } from "bun:test";
import { findBlockedFiles } from "../remove-files";

describe("Remove Files Fixer", () => {
  test(".env in diff is flagged for removal", () => {
    const actions = findBlockedFiles([{ path: ".env", status: "added" }]);
    expect(actions.length).toBe(1);
    expect(actions[0].type).toBe("remove_file");
  });

  test(".env.local in diff is flagged", () => {
    const actions = findBlockedFiles([{ path: ".env.local", status: "added" }]);
    expect(actions.length).toBe(1);
  });

  test(".env.production in diff is flagged", () => {
    const actions = findBlockedFiles([{ path: ".env.production", status: "modified" }]);
    expect(actions.length).toBe(1);
  });

  test(".DS_Store in diff is flagged", () => {
    const actions = findBlockedFiles([{ path: ".DS_Store", status: "added" }]);
    expect(actions.length).toBe(1);
  });

  test("node_modules file in diff is flagged", () => {
    const actions = findBlockedFiles([{ path: "node_modules/express/index.js", status: "added" }]);
    expect(actions.length).toBe(1);
  });

  test(".claude/ file in diff is flagged", () => {
    const actions = findBlockedFiles([{ path: ".claude/settings.json", status: "added" }]);
    expect(actions.length).toBe(1);
  });

  test("__pycache__ file in diff is flagged", () => {
    const actions = findBlockedFiles([{ path: "__pycache__/module.cpython-311.pyc", status: "added" }]);
    expect(actions.length).toBe(1);
  });

  test("normal source files are NOT flagged", () => {
    const actions = findBlockedFiles([
      { path: "src/index.ts", status: "modified" },
      { path: "package.json", status: "modified" },
    ]);
    expect(actions.length).toBe(0);
  });

  test("deleted files are skipped", () => {
    const actions = findBlockedFiles([{ path: ".env", status: "deleted" }]);
    expect(actions.length).toBe(0);
  });

  test("multiple blocked files in one commit are all found", () => {
    const actions = findBlockedFiles([
      { path: ".env", status: "added" },
      { path: ".DS_Store", status: "added" },
      { path: "node_modules/pkg/index.js", status: "added" },
      { path: "src/index.ts", status: "modified" },
    ]);
    expect(actions.length).toBe(3);
  });

  test(".pem file is flagged", () => {
    const actions = findBlockedFiles([{ path: "server.pem", status: "added" }]);
    expect(actions.length).toBe(1);
  });
});
