import type { CheckResult, CheckRunResults, Annotation } from "./types";

function statusLabel(status: string): string {
  switch (status) {
    case "pass": return "PASS";
    case "fail": return "FAIL";
    case "warn": return "WARN";
    default: return "UNKNOWN";
  }
}

export function generateAgentFeedback(results: CheckRunResults): string {
  const lines: string[] = [];

  lines.push("<!-- lastgate:feedback -->");
  lines.push("");
  lines.push("## LastGate Check Results");
  lines.push("");

  // Overall status
  if (results.hasFailures) {
    lines.push(`**Status: BLOCKED** - ${results.failureCount} check(s) must be resolved before merge`);
  } else if (results.hasWarnings) {
    lines.push(`**Status: WARNINGS** - ${results.warningCount} non-blocking issue(s) found`);
  } else {
    lines.push("**Status: PASSED** - All checks passed");
  }

  lines.push("");
  lines.push("| Check | Status | Summary |");
  lines.push("|-------|--------|---------|");

  for (const result of results.checks) {
    const summary = result.summary ?? "";
    lines.push(`| ${result.title} | ${statusLabel(result.status)} | ${summary} |`);
  }

  lines.push("");

  // Failures section (blocking)
  const failures = results.checks.filter((r: CheckResult) => r.status === "fail");
  if (failures.length > 0) {
    lines.push("### Failures (blocking)");
    lines.push("");

    for (const result of failures) {
      lines.push(`#### ${result.title}`);
      lines.push("");

      if (result.summary) {
        lines.push(result.summary);
        lines.push("");
      }

      // Extract findings from details if available
      const details = result.details;
      const findings = (details.findings ?? details.errors ?? details.issues) as
        Array<{ file?: string; line?: number; message?: string; issue?: string; pattern?: string; details?: string; severity?: string }> | undefined;

      if (findings && Array.isArray(findings)) {
        for (const finding of findings) {
          const message = finding.message ?? finding.issue ?? finding.details ?? "";
          const location = finding.file
            ? finding.line
              ? `\`${finding.file}:${finding.line}\``
              : `\`${finding.file}\``
            : "";

          const severity = finding.severity ? `[${String(finding.severity).toUpperCase()}]` : "";
          lines.push(`- ${severity} ${location ? location + " " : ""}${message}`);
        }
        lines.push("");
      }
    }
  }

  // Warnings section (non-blocking)
  const warnings = results.checks.filter((r: CheckResult) => r.status === "warn");
  if (warnings.length > 0) {
    lines.push("### Warnings (non-blocking)");
    lines.push("");

    for (const result of warnings) {
      lines.push(`#### ${result.title}`);
      lines.push("");

      if (result.summary) {
        lines.push(result.summary);
        lines.push("");
      }

      const details = result.details;
      const findings = (details.findings ?? details.issues) as
        Array<{ message?: string; issue?: string; details?: string; pattern?: string; severity?: string }> | undefined;

      if (findings && Array.isArray(findings)) {
        for (const finding of findings) {
          const message = finding.message ?? finding.issue ?? finding.details ?? "";
          const severity = finding.severity ? `[${String(finding.severity).toUpperCase()}]` : "";
          lines.push(`- ${severity} ${message}`);
        }
        lines.push("");
      }
    }
  }

  // Annotations summary
  if (results.annotations.length > 0) {
    lines.push("### Annotations");
    lines.push("");
    for (const ann of results.annotations) {
      const level = ann.annotation_level === "failure" ? "FAIL"
        : ann.annotation_level === "warning" ? "WARN"
        : "INFO";
      lines.push(`- [${level}] \`${ann.path}:${ann.start_line}\` ${ann.title}: ${ann.message}`);
    }
    lines.push("");
  }

  // Footer
  lines.push("---");
  lines.push(`*${results.summary}*`);
  lines.push("<!-- /lastgate:feedback -->");

  return lines.join("\n");
}
