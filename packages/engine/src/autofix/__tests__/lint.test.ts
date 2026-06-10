import { describe, test, expect } from "bun:test";
import { findLinterAutofixable } from "../fixers/lint";

describe("findLinterAutofixable", () => {
  test("emits one linter_fix action listing changed lintable files", () => {
    const actions = findLinterAutofixable([
      { path: "src/a.ts", status: "modified" },
      { path: "src/b.py", status: "added" },
      { path: "README.md", status: "modified" },
    ]);
    expect(actions.length).toBe(1);
    expect(actions[0].type).toBe("linter_fix");
    expect(actions[0].file).toContain("src/a.ts");
    expect(actions[0].file).toContain("src/b.py");
    expect(actions[0].file).not.toContain("README.md");
    expect(actions[0].description).toContain("2 changed files");
  });

  test("ignores deleted files and non-lintable extensions", () => {
    const actions = findLinterAutofixable([
      { path: "src/a.ts", status: "deleted" },
      { path: "data.json", status: "modified" },
    ]);
    expect(actions).toEqual([]);
  });

  test("singular phrasing for one file", () => {
    const actions = findLinterAutofixable([{ path: "x.tsx", status: "added" }]);
    expect(actions[0].description).toContain("1 changed file");
    expect(actions[0].description).not.toContain("files");
  });
});
