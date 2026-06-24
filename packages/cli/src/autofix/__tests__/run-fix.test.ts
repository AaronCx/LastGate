import { describe, test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFix } from "../run-fix";

describe("runFix (CLI --fix applier)", () => {
  test("applies safe fixes to the working tree on a non-protected branch", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lg-fix-"));
    writeFileSync(join(dir, "src.ts"), "const x = 1;   \nno-eof");
    writeFileSync(join(dir, ".env"), "SECRET=abc");
    writeFileSync(join(dir, ".env.example"), "template");

    const report = await runFix(
      [
        { path: "src.ts", status: "modified" },
        { path: ".env", status: "added" },
        { path: ".env.example", status: "added" },
      ],
      "feature/x",
      dir,
    );

    expect(report.blocked).toBeUndefined();
    const fixed = readFileSync(join(dir, "src.ts"), "utf8");
    expect(/[ \t]+$/m.test(fixed)).toBe(false); // trailing whitespace stripped
    expect(fixed.endsWith("\n")).toBe(true); // eof newline added
    expect(existsSync(join(dir, ".env"))).toBe(false); // blocked file removed
    expect(existsSync(join(dir, ".env.example"))).toBe(true); // template KEPT
    expect(report.applied.some((a) => a.type === "remove_file")).toBe(true);
  });

  test("refuses to touch a protected branch (fails closed)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lg-fix-"));
    writeFileSync(join(dir, "src.ts"), "x   ");
    const report = await runFix([{ path: "src.ts", status: "modified" }], "main", dir);
    expect(report.blocked).toBeTruthy();
    expect(readFileSync(join(dir, "src.ts"), "utf8")).toBe("x   "); // untouched
  });
});
