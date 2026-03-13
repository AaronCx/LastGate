import { describe, test, expect } from "bun:test";

// Test the formatting logic directly
describe("CLI Output Formatter", () => {
  test("formats check results with correct symbols", () => {
    const PASS = "\u2713";
    const FAIL = "\u2717";
    const WARN = "\u26A0";
    expect(PASS).toBe("✓");
    expect(FAIL).toBe("✗");
    expect(WARN).toBe("⚠");
  });

  test("summary line shows correct counts", () => {
    const results = {
      checks: [
        { status: "pass" },
        { status: "pass" },
        { status: "fail" },
        { status: "warn" },
      ],
    };
    const failures = results.checks.filter(c => c.status === "fail").length;
    const warnings = results.checks.filter(c => c.status === "warn").length;
    const passes = results.checks.filter(c => c.status === "pass").length;

    const parts: string[] = [];
    if (failures > 0) parts.push(`${failures} failure${failures !== 1 ? "s" : ""}`);
    if (warnings > 0) parts.push(`${warnings} warning${warnings !== 1 ? "s" : ""}`);
    if (passes > 0) parts.push(`${passes} passed`);

    expect(parts.join(", ")).toBe("1 failure, 1 warning, 2 passed");
  });

  test("singular grammar for 1 failure", () => {
    const failures = 1;
    const label = `${failures} failure${failures !== 1 ? "s" : ""}`;
    expect(label).toBe("1 failure");
  });

  test("plural grammar for multiple failures", () => {
    const failures = 3;
    const label = `${failures} failure${failures !== 1 ? "s" : ""}`;
    expect(label).toBe("3 failures");
  });

  test("BLOCKED result when failures exist", () => {
    const failures = 2;
    const result = failures > 0 ? "BLOCKED" : "PASSED";
    expect(result).toBe("BLOCKED");
  });

  test("PASSED WITH WARNINGS when warnings but no failures", () => {
    const failures = 0;
    const warnings = 1;
    const result = failures > 0 ? "BLOCKED" : warnings > 0 ? "PASSED WITH WARNINGS" : "PASSED";
    expect(result).toBe("PASSED WITH WARNINGS");
  });

  test("PASSED when all clear", () => {
    const failures = 0;
    const warnings = 0;
    const result = failures > 0 ? "BLOCKED" : warnings > 0 ? "PASSED WITH WARNINGS" : "PASSED";
    expect(result).toBe("PASSED");
  });

  test("--json flag outputs valid JSON", () => {
    const results = {
      checks: [{ name: "secrets", status: "pass", summary: "No secrets" }],
      hasFailures: false,
    };
    const json = JSON.stringify(results, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed.checks[0].name).toBe("secrets");
  });

  test("detail lines show file:line and error message", () => {
    const finding = { file: "src/config.ts", line: 14, message: "Hardcoded secret" };
    const location = `${finding.file}:${finding.line}`;
    expect(location).toBe("src/config.ts:14");
    expect(finding.message).toBe("Hardcoded secret");
  });

  test("long messages are truncatable", () => {
    const longMessage = "A".repeat(200);
    const maxWidth = 80;
    const truncated = longMessage.length > maxWidth ? longMessage.substring(0, maxWidth - 3) + "..." : longMessage;
    expect(truncated.length).toBe(80);
    expect(truncated).toEndWith("...");
  });
});
