import { describe, test, expect } from "bun:test";
import { generateAgentFeedback } from "../feedback";
import type { CheckRunResults, CheckResult, Annotation } from "../types";

function makeResults(checks: CheckResult[], annotations: Annotation[] = []): CheckRunResults {
  const failures = checks.filter(c => c.status === "fail");
  const warnings = checks.filter(c => c.status === "warn");
  return {
    checks,
    hasFailures: failures.length > 0,
    hasWarnings: warnings.length > 0,
    failureCount: failures.length,
    warningCount: warnings.length,
    summary: `${checks.filter(c => c.status === "pass").length} passed, ${warnings.length} warnings, ${failures.length} failures`,
    annotations,
  };
}

describe("Agent Feedback Generator", () => {
  test("generates markdown with lastgate:feedback comment markers", () => {
    const results = makeResults([{
      type: "secrets",
      status: "pass",
      title: "Secret Scanner",
      details: {},
    }]);
    const feedback = generateAgentFeedback(results);
    expect(feedback).toContain("<!-- lastgate:feedback -->");
    expect(feedback).toContain("<!-- /lastgate:feedback -->");
  });

  test("lists all failures with file, line, issue, and fix suggestion", () => {
    const results = makeResults([{
      type: "secrets",
      status: "fail",
      title: "Secret Scanner",
      summary: "Found 1 potential secret(s)",
      details: {
        findings: [{
          file: "src/config.ts",
          line: 14,
          pattern: "AWS Access Key",
          match: "AKIA****CDEF",
          severity: "critical",
        }],
      },
    }]);
    const feedback = generateAgentFeedback(results);
    expect(feedback).toContain("src/config.ts:14");
    expect(feedback).toContain("BLOCKED");
    expect(feedback).toContain("Failures (blocking)");
  });

  test("lists warnings separately as non-blocking", () => {
    const results = makeResults([
      {
        type: "secrets",
        status: "pass",
        title: "Secret Scanner",
        details: {},
      },
      {
        type: "commit_message",
        status: "warn",
        title: "Commit Message Validator",
        summary: "Found 1 issue",
        details: {
          findings: [{ message: "Generic commit message", severity: "medium" }],
        },
      },
    ]);
    const feedback = generateAgentFeedback(results);
    expect(feedback).toContain("Warnings (non-blocking)");
    expect(feedback).toContain("WARNINGS");
  });

  test("all-passed generates PASSED message", () => {
    const results = makeResults([
      { type: "secrets", status: "pass", title: "Secret Scanner", details: {} },
      { type: "lint", status: "pass", title: "Lint & Type Check", details: {} },
    ]);
    const feedback = generateAgentFeedback(results);
    expect(feedback).toContain("PASSED");
    expect(feedback).not.toContain("BLOCKED");
    expect(feedback).not.toContain("Failures (blocking)");
  });

  test("single failure uses correct grammar", () => {
    const results = makeResults([{
      type: "secrets",
      status: "fail",
      title: "Secret Scanner",
      summary: "Found 1 potential secret(s)",
      details: { findings: [{ file: "a.ts", line: 1, pattern: "test", severity: "high" }] },
    }]);
    const feedback = generateAgentFeedback(results);
    expect(feedback).toContain("1 check(s) must be resolved");
  });

  test("multiple failures across checks are all listed", () => {
    const results = makeResults([
      {
        type: "secrets",
        status: "fail",
        title: "Secret Scanner",
        summary: "Found secrets",
        details: { findings: [{ file: "a.ts", line: 1, pattern: "AWS", severity: "critical" }] },
      },
      {
        type: "file_patterns",
        status: "fail",
        title: "File Pattern Guard",
        summary: "Blocked files found",
        details: { findings: [{ file: ".env", blockedBy: ".env" }] },
      },
    ]);
    const feedback = generateAgentFeedback(results);
    expect(feedback).toContain("Secret Scanner");
    expect(feedback).toContain("File Pattern Guard");
    expect(feedback).toContain("2 check(s)");
  });

  test("output is parseable — contains structured table", () => {
    const results = makeResults([
      { type: "secrets", status: "pass", title: "Secret Scanner", summary: "No secrets", details: {} },
      { type: "lint", status: "fail", title: "Lint", summary: "2 errors", details: { errors: [{ message: "err" }] } },
    ]);
    const feedback = generateAgentFeedback(results);
    // Verify table structure
    expect(feedback).toContain("| Check | Status | Summary |");
    expect(feedback).toContain("| Secret Scanner | PASS |");
    expect(feedback).toContain("| Lint | FAIL |");
  });

  test("includes annotations section when present", () => {
    const annotations: Annotation[] = [{
      path: "src/config.ts",
      start_line: 14,
      end_line: 14,
      annotation_level: "failure",
      message: "Hardcoded secret detected",
      title: "secrets: AWS Access Key",
    }];
    const results = makeResults([
      { type: "secrets", status: "fail", title: "Secret Scanner", summary: "1 secret", details: {} },
    ], annotations);
    const feedback = generateAgentFeedback(results);
    expect(feedback).toContain("Annotations");
    expect(feedback).toContain("src/config.ts:14");
  });
});
