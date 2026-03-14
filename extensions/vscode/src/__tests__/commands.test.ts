import { describe, test, expect } from "bun:test";
import { COMMANDS, getCommandTitle } from "../commands";

describe("VS Code Commands", () => {
  test("all commands have correct IDs", () => {
    expect(COMMANDS.runCheck).toBe("lastgate.runCheck");
    expect(COMMANDS.viewDashboard).toBe("lastgate.viewDashboard");
    expect(COMMANDS.showFindings).toBe("lastgate.showFindings");
  });

  test("runCheck has correct title", () => {
    expect(getCommandTitle(COMMANDS.runCheck)).toContain("Run Check");
  });

  test("viewDashboard has correct title", () => {
    expect(getCommandTitle(COMMANDS.viewDashboard)).toContain("View Dashboard");
  });

  test("showFindings has correct title", () => {
    expect(getCommandTitle(COMMANDS.showFindings)).toContain("Show Findings");
  });

  test("all command IDs start with lastgate.", () => {
    for (const id of Object.values(COMMANDS)) {
      expect(id.startsWith("lastgate.")).toBe(true);
    }
  });
});
