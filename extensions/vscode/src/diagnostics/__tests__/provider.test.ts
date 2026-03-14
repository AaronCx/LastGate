import { describe, test, expect } from "bun:test";
import { mapFindingToDiagnostic, groupFindingsByFile, type Finding } from "../mapper";

describe("Inline Diagnostics Provider", () => {
  test("fail findings map to error severity", () => {
    const diag = mapFindingToDiagnostic({
      file: "src/index.ts",
      line: 10,
      message: "API key in source",
      checkType: "secrets",
      status: "fail",
    });
    expect(diag.severity).toBe("error");
  });

  test("warn findings map to warning severity", () => {
    const diag = mapFindingToDiagnostic({
      file: "src/index.ts",
      line: 5,
      message: "Generic commit",
      checkType: "commit_message",
      status: "warn",
    });
    expect(diag.severity).toBe("warning");
  });

  test("diagnostic range maps correctly (0-indexed line)", () => {
    const diag = mapFindingToDiagnostic({
      file: "src/index.ts",
      line: 14,
      message: "Issue",
      checkType: "lint",
      status: "fail",
    });
    expect(diag.line).toBe(13); // 0-indexed
    expect(diag.column).toBe(0);
  });

  test("diagnostic message includes check type and finding message", () => {
    const diag = mapFindingToDiagnostic({
      file: "src/index.ts",
      line: 1,
      message: "Unused import",
      checkType: "lint",
      status: "fail",
    });
    expect(diag.message).toContain("[lint]");
    expect(diag.message).toContain("Unused import");
  });

  test("diagnostic source is LastGate", () => {
    const diag = mapFindingToDiagnostic({
      file: "src/index.ts",
      line: 1,
      message: "Issue",
      checkType: "lint",
      status: "fail",
    });
    expect(diag.source).toBe("LastGate");
  });

  test("missing line number defaults to 0", () => {
    const diag = mapFindingToDiagnostic({
      file: "src/index.ts",
      message: "Build failed",
      checkType: "build",
      status: "fail",
    });
    expect(diag.line).toBe(0);
  });

  test("multiple findings on same file are grouped", () => {
    const findings: Finding[] = [
      { file: "src/a.ts", line: 1, message: "E1", checkType: "lint", status: "fail" },
      { file: "src/a.ts", line: 5, message: "E2", checkType: "lint", status: "fail" },
      { file: "src/b.ts", line: 1, message: "E3", checkType: "secrets", status: "fail" },
    ];
    const grouped = groupFindingsByFile(findings);
    expect(grouped.size).toBe(2);
    expect(grouped.get("src/a.ts")!.length).toBe(2);
    expect(grouped.get("src/b.ts")!.length).toBe(1);
  });
});
