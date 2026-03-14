import { describe, test, expect } from "bun:test";
import { findTrailingWhitespace, fixTrailingWhitespace, findMissingEofNewline, fixEofNewline } from "../whitespace";

describe("Whitespace Fixer", () => {
  test("file with trailing spaces is detected", () => {
    const actions = findTrailingWhitespace([
      { path: "src/a.ts", content: "line1  \nline2\nline3   \n", status: "modified" },
    ]);
    expect(actions.length).toBe(1);
    expect(actions[0].type).toBe("fix_whitespace");
  });

  test("file with trailing tabs is detected", () => {
    const actions = findTrailingWhitespace([
      { path: "src/b.ts", content: "line1\t\nline2\n", status: "modified" },
    ]);
    expect(actions.length).toBe(1);
  });

  test("file with no trailing whitespace is unchanged", () => {
    const actions = findTrailingWhitespace([
      { path: "src/c.ts", content: "line1\nline2\n", status: "modified" },
    ]);
    expect(actions.length).toBe(0);
  });

  test("fixTrailingWhitespace removes trailing spaces", () => {
    const result = fixTrailingWhitespace("line1  \nline2   \nline3\n");
    expect(result).toBe("line1\nline2\nline3\n");
  });

  test("fixTrailingWhitespace removes trailing tabs", () => {
    const result = fixTrailingWhitespace("line1\t\nline2\t\t\n");
    expect(result).toBe("line1\nline2\n");
  });

  test("only changed files are checked (deleted files skipped)", () => {
    const actions = findTrailingWhitespace([
      { path: "src/d.ts", content: "line  \n", status: "deleted" },
    ]);
    expect(actions.length).toBe(0);
  });
});

describe("EOF Newline Fixer", () => {
  test("file missing final newline is detected", () => {
    const actions = findMissingEofNewline([
      { path: "src/a.ts", content: "line1\nline2", status: "modified" },
    ]);
    expect(actions.length).toBe(1);
    expect(actions[0].type).toBe("fix_eof");
  });

  test("file with final newline is unchanged", () => {
    const actions = findMissingEofNewline([
      { path: "src/b.ts", content: "line1\nline2\n", status: "modified" },
    ]);
    expect(actions.length).toBe(0);
  });

  test("fixEofNewline adds missing newline", () => {
    expect(fixEofNewline("line1\nline2")).toBe("line1\nline2\n");
  });

  test("fixEofNewline leaves existing newline alone", () => {
    expect(fixEofNewline("line1\nline2\n")).toBe("line1\nline2\n");
  });

  test("empty content is unchanged", () => {
    const actions = findMissingEofNewline([
      { path: "empty.ts", content: "", status: "modified" },
    ]);
    expect(actions.length).toBe(0);
  });

  test("deleted files are skipped", () => {
    const actions = findMissingEofNewline([
      { path: "src/d.ts", content: "no newline", status: "deleted" },
    ]);
    expect(actions.length).toBe(0);
  });
});
