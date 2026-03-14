import { describe, test, expect } from "bun:test";
import { getStatusBarText, getStatusBarColor } from "../statusBar";

describe("VS Code Status Bar", () => {
  test("passing shows green text with shield icon", () => {
    const text = getStatusBarText({ status: "passing" });
    expect(text).toContain("$(shield)");
    expect(text).toContain("passing");
  });

  test("failing shows red text", () => {
    const text = getStatusBarText({ status: "failing" });
    expect(text).toContain("failing");
    expect(text).toContain("$(shield)");
  });

  test("warnings shows yellow text", () => {
    const text = getStatusBarText({ status: "warnings" });
    expect(text).toContain("warnings");
  });

  test("unknown shows unknown text", () => {
    const text = getStatusBarText({ status: "unknown" });
    expect(text).toContain("unknown");
  });

  test("loading shows loading text", () => {
    const text = getStatusBarText({ status: "loading" });
    expect(text).toContain("loading");
  });

  test("status bar colors map correctly", () => {
    expect(getStatusBarColor("passing")).toBe("statusBarItem.foreground");
    expect(getStatusBarColor("failing")).toBe("errorForeground");
    expect(getStatusBarColor("warnings")).toBe("warningForeground");
    expect(getStatusBarColor("unknown")).toBe("statusBarItem.foreground");
  });
});
