import { describe, test, expect } from "bun:test";
import { getStatusBarText, getStatusBarColor } from "../../extensions/vscode/src/statusBar";
import { mapFindingToDiagnostic, groupFindingsByFile } from "../../extensions/vscode/src/diagnostics/mapper";
import { COMMANDS, getCommandTitle } from "../../extensions/vscode/src/commands";

describe("VS Code Status Bar", () => {
  test("passing status shows green text", () => {
    const text = getStatusBarText({ status: "passing" });
    expect(text).toContain("passing");
    expect(text).toContain("$(shield)");
  });

  test("failing status shows failing text", () => {
    const text = getStatusBarText({ status: "failing" });
    expect(text).toContain("failing");
  });

  test("warnings status shows warnings text", () => {
    const text = getStatusBarText({ status: "warnings" });
    expect(text).toContain("warnings");
  });

  test("unknown status shows unknown text", () => {
    const text = getStatusBarText({ status: "unknown" });
    expect(text).toContain("unknown");
  });

  test("loading status shows loading text", () => {
    const text = getStatusBarText({ status: "loading" });
    expect(text).toContain("loading");
  });

  test("status bar colors map correctly", () => {
    expect(getStatusBarColor("failing")).toBe("errorForeground");
    expect(getStatusBarColor("warnings")).toBe("warningForeground");
    expect(getStatusBarColor("passing")).toBe("statusBarItem.foreground");
  });
});

describe("VS Code Diagnostics Mapper", () => {
  test("maps fail finding to error diagnostic", () => {
    const diag = mapFindingToDiagnostic({
      file: "src/index.ts",
      line: 14,
      message: "Possible API key detected",
      checkType: "secrets",
      status: "fail",
    });
    expect(diag.severity).toBe("error");
    expect(diag.line).toBe(13); // 0-indexed
    expect(diag.message).toContain("[secrets]");
    expect(diag.source).toBe("LastGate");
  });

  test("maps warn finding to warning diagnostic", () => {
    const diag = mapFindingToDiagnostic({
      file: "src/index.ts",
      line: 5,
      message: "Generic commit message",
      checkType: "commit_message",
      status: "warn",
    });
    expect(diag.severity).toBe("warning");
  });

  test("handles missing line number", () => {
    const diag = mapFindingToDiagnostic({
      file: "src/index.ts",
      message: "Build failed",
      checkType: "build",
      status: "fail",
    });
    expect(diag.line).toBe(0);
  });

  test("groups findings by file", () => {
    const findings = [
      { file: "src/a.ts", line: 1, message: "Error 1", checkType: "lint", status: "fail" as const },
      { file: "src/a.ts", line: 5, message: "Error 2", checkType: "lint", status: "fail" as const },
      { file: "src/b.ts", line: 1, message: "Error 3", checkType: "secrets", status: "fail" as const },
    ];
    const grouped = groupFindingsByFile(findings);
    expect(grouped.size).toBe(2);
    expect(grouped.get("src/a.ts")).toHaveLength(2);
    expect(grouped.get("src/b.ts")).toHaveLength(1);
  });
});

describe("VS Code Commands", () => {
  test("all commands have IDs", () => {
    expect(COMMANDS.runCheck).toBe("lastgate.runCheck");
    expect(COMMANDS.viewDashboard).toBe("lastgate.viewDashboard");
    expect(COMMANDS.showFindings).toBe("lastgate.showFindings");
  });

  test("all commands have titles", () => {
    expect(getCommandTitle(COMMANDS.runCheck)).toContain("Run Check");
    expect(getCommandTitle(COMMANDS.viewDashboard)).toContain("View Dashboard");
    expect(getCommandTitle(COMMANDS.showFindings)).toContain("Show Findings");
  });
});
