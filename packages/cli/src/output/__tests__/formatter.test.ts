import { describe, test, expect } from "bun:test";
import { formatCheckResults, formatResultsJson } from "../formatter";
import type { CheckRunResults } from "@lastgate/engine";

/**
 * Tests for formatCheckResults and formatResultsJson.
 *
 * CheckResult uses .type (not .name) for the check identifier,
 * and findings live at check.details.findings.
 */

function makeResults(
  checks: Array<{
    type: string;
    status: "pass" | "fail" | "warn";
    title?: string;
    summary?: string;
    details?: Record<string, unknown>;
    duration_ms?: number;
  }>
): CheckRunResults {
  const failures = checks.filter((c) => c.status === "fail").length;
  const warnings = checks.filter((c) => c.status === "warn").length;

  return {
    checks: checks.map((c) => ({
      type: c.type,
      status: c.status,
      title: c.title || c.type,
      summary: c.summary,
      details: c.details || {},
      duration_ms: c.duration_ms,
    })),
    hasFailures: failures > 0,
    hasWarnings: warnings > 0,
    failureCount: failures,
    warningCount: warnings,
    summary: `${failures} failures, ${warnings} warnings`,
    annotations: [],
  } as unknown as CheckRunResults;
}

describe("formatCheckResults", () => {
  test("includes header text", () => {
    const results = makeResults([
      { type: "secrets", status: "pass" },
    ]);
    const output = formatCheckResults(results);
    expect(output).toContain("LastGate Pre-flight Check");
  });

  test("displays check type in output", () => {
    const results = makeResults([
      { type: "secrets", status: "pass" },
      { type: "lint", status: "pass" },
    ]);
    const output = formatCheckResults(results);
    expect(output).toContain("secrets");
    expect(output).toContain("lint");
  });

  test("shows PASSED for all-pass results", () => {
    const results = makeResults([
      { type: "secrets", status: "pass" },
      { type: "lint", status: "pass" },
    ]);
    const output = formatCheckResults(results);
    expect(output).toContain("ALL CLEAR");
    expect(output).not.toContain("BLOCKED");
  });

  test("shows BLOCKED when any check fails", () => {
    const results = makeResults([
      { type: "secrets", status: "fail" },
      { type: "lint", status: "pass" },
    ]);
    const output = formatCheckResults(results);
    expect(output).toContain("BLOCKED");
  });

  test("shows PASSED WITH WARNINGS for warn-only results", () => {
    const results = makeResults([
      { type: "secrets", status: "pass" },
      { type: "lint", status: "warn" },
    ]);
    const output = formatCheckResults(results);
    expect(output).toContain("PASSED WITH WARNINGS");
  });

  test("BLOCKED takes precedence over warnings", () => {
    const results = makeResults([
      { type: "secrets", status: "fail" },
      { type: "lint", status: "warn" },
    ]);
    const output = formatCheckResults(results);
    expect(output).toContain("BLOCKED");
    expect(output).not.toContain("PASSED WITH WARNINGS");
  });

  test("displays summary counts", () => {
    const results = makeResults([
      { type: "secrets", status: "fail" },
      { type: "lint", status: "warn" },
      { type: "build", status: "pass" },
    ]);
    const output = formatCheckResults(results);
    expect(output).toContain("1 failed");
    expect(output).toContain("1 warning");
    expect(output).toContain("1 passed");
  });

  test("pluralizes counts correctly for multiples", () => {
    const results = makeResults([
      { type: "secrets", status: "fail" },
      { type: "lint", status: "fail" },
      { type: "build", status: "warn" },
      { type: "test", status: "warn" },
    ]);
    const output = formatCheckResults(results);
    expect(output).toContain("2 failed");
    expect(output).toContain("2 warnings");
  });

  test("singular grammar for exactly 1 failure", () => {
    const results = makeResults([
      { type: "secrets", status: "fail" },
      { type: "lint", status: "pass" },
    ]);
    const output = formatCheckResults(results);
    expect(output).toContain("1 failed");
  });

  test("shows title for each check", () => {
    const results = makeResults([
      { type: "secrets", status: "pass", title: "Secret Scanner" },
    ]);
    const output = formatCheckResults(results);
    expect(output).toContain("Secret Scanner");
  });

  test("falls back to title when summary is undefined", () => {
    const results = makeResults([
      { type: "secrets", status: "pass", title: "Secrets Check" },
    ]);
    const output = formatCheckResults(results);
    expect(output).toContain("Secrets Check");
  });

  test("displays findings from check.details.findings", () => {
    const results = makeResults([
      {
        type: "secrets",
        status: "fail",
        details: {
          findings: [
            {
              severity: "error",
              file: "config.ts",
              line: 42,
              message: "Hardcoded API key detected",
            },
          ],
        },
      },
    ]);
    const output = formatCheckResults(results);
    expect(output).toContain("config.ts");
    expect(output).toContain("42");
    expect(output).toContain("Hardcoded API key detected");
  });

  test("displays finding message for error severity findings", () => {
    const results = makeResults([
      {
        type: "secrets",
        status: "fail",
        details: {
          findings: [
            { severity: "error", message: "critical issue" },
          ],
        },
      },
    ]);
    const output = formatCheckResults(results);
    expect(output).toContain("critical issue");
    expect(output).toContain("Failures");
  });

  test("displays WARN label for warning severity findings", () => {
    const results = makeResults([
      {
        type: "lint",
        status: "warn",
        details: {
          findings: [
            { severity: "warning", message: "minor issue" },
          ],
        },
      },
    ]);
    const output = formatCheckResults(results);
    expect(output).toContain("WARN");
  });

  test("displays finding message for info severity findings", () => {
    const results = makeResults([
      {
        type: "lint",
        status: "pass",
        details: {
          findings: [
            { severity: "info", message: "suggestion" },
          ],
        },
      },
    ]);
    const output = formatCheckResults(results);
    expect(output).toContain("suggestion");
  });

  test("handles findings without file location", () => {
    const results = makeResults([
      {
        type: "secrets",
        status: "fail",
        details: {
          findings: [
            { severity: "error", message: "global issue" },
          ],
        },
      },
    ]);
    const output = formatCheckResults(results);
    expect(output).toContain("global issue");
  });

  test("handles findings without line number", () => {
    const results = makeResults([
      {
        type: "lint",
        status: "warn",
        details: {
          findings: [
            { severity: "warning", file: "app.ts", message: "unused import" },
          ],
        },
      },
    ]);
    const output = formatCheckResults(results);
    expect(output).toContain("app.ts");
    expect(output).toContain("unused import");
  });

  test("skips findings section when no checks have findings", () => {
    const results = makeResults([
      { type: "secrets", status: "pass", details: {} },
    ]);
    const output = formatCheckResults(results);
    expect(output).not.toContain("Findings");
  });

  test("skips checks with empty findings array", () => {
    const results = makeResults([
      { type: "lint", status: "pass", details: { findings: [] } },
    ]);
    const output = formatCheckResults(results);
    expect(output).not.toContain("Findings");
  });

  test("renders multiple findings under one check", () => {
    const results = makeResults([
      {
        type: "secrets",
        status: "fail",
        details: {
          findings: [
            { severity: "error", file: "a.ts", line: 1, message: "first" },
            { severity: "error", file: "b.ts", line: 5, message: "second" },
            { severity: "warning", file: "c.ts", line: 10, message: "third" },
          ],
        },
      },
    ]);
    const output = formatCheckResults(results);
    expect(output).toContain("first");
    expect(output).toContain("second");
    expect(output).toContain("third");
  });

  test("findings from multiple checks are all displayed", () => {
    const results = makeResults([
      {
        type: "secrets",
        status: "fail",
        details: {
          findings: [
            { severity: "error", message: "secret found" },
          ],
        },
      },
      {
        type: "lint",
        status: "warn",
        details: {
          findings: [
            { severity: "warning", message: "lint warning" },
          ],
        },
      },
    ]);
    const output = formatCheckResults(results);
    expect(output).toContain("secret found");
    expect(output).toContain("lint warning");
  });
});

describe("formatResultsJson", () => {
  test("returns valid JSON string", () => {
    const results = makeResults([
      { type: "secrets", status: "pass" },
    ]);
    const jsonStr = formatResultsJson(results);
    const parsed = JSON.parse(jsonStr);
    expect(parsed).toBeDefined();
  });

  test("preserves check type in JSON output", () => {
    const results = makeResults([
      { type: "secrets", status: "pass" },
    ]);
    const parsed = JSON.parse(formatResultsJson(results));
    expect(parsed.checks[0].type).toBe("secrets");
  });

  test("preserves all fields in JSON output", () => {
    const results = makeResults([
      {
        type: "lint",
        status: "fail",
        title: "Lint Check",
        summary: "3 issues found",
        details: { findings: [{ message: "unused var" }] },
        duration_ms: 150,
      },
    ]);
    const parsed = JSON.parse(formatResultsJson(results));
    const check = parsed.checks[0];
    expect(check.type).toBe("lint");
    expect(check.status).toBe("fail");
    expect(check.title).toBe("Lint Check");
    expect(check.summary).toBe("3 issues found");
    expect(check.details.findings).toHaveLength(1);
    expect(check.duration_ms).toBe(150);
  });

  test("includes aggregate fields", () => {
    const results = makeResults([
      { type: "secrets", status: "fail" },
      { type: "lint", status: "warn" },
    ]);
    const parsed = JSON.parse(formatResultsJson(results));
    expect(parsed.hasFailures).toBe(true);
    expect(parsed.hasWarnings).toBe(true);
    expect(parsed.failureCount).toBe(1);
    expect(parsed.warningCount).toBe(1);
  });

  test("output is pretty-printed with 2-space indent", () => {
    const results = makeResults([{ type: "secrets", status: "pass" }]);
    const jsonStr = formatResultsJson(results);
    expect(jsonStr).toContain("\n");
    expect(jsonStr).toContain("  ");
  });
});
