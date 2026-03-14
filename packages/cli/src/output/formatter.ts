import type { CheckRunResults } from "@lastgate/engine";
import { success, error, warning, dim, bold, PASS, FAIL, WARN } from "./colors";

const SEPARATOR = "\u2501".repeat(27);

function statusIcon(status: "pass" | "fail" | "warn"): string {
  switch (status) {
    case "pass":
      return success(PASS);
    case "fail":
      return error(FAIL);
    case "warn":
      return warning(WARN);
  }
}

function padRight(text: string, width: number): string {
  return text.padEnd(width);
}

export function formatCheckResults(results: CheckRunResults): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(bold("LastGate Pre-flight Check"));
  lines.push(dim(SEPARATOR));

  const maxNameLen = Math.max(
    ...results.checks.map((c) => c.type.length),
    12
  );

  for (const check of results.checks) {
    const icon = statusIcon(check.status);
    const name = padRight(check.type, maxNameLen + 2);
    const message = check.summary || check.title || "";

    lines.push(`${icon} ${name} ${message}`);
  }

  lines.push(dim(SEPARATOR));

  const failures = results.checks.filter((c) => c.status === "fail").length;
  const warnings = results.checks.filter((c) => c.status === "warn").length;
  const passes = results.checks.filter((c) => c.status === "pass").length;

  const parts: string[] = [];
  if (failures > 0) parts.push(`${failures} failure${failures !== 1 ? "s" : ""}`);
  if (warnings > 0) parts.push(`${warnings} warning${warnings !== 1 ? "s" : ""}`);
  if (passes > 0) parts.push(`${passes} passed`);

  if (failures > 0) {
    lines.push(error(`Result: BLOCKED`) + dim(` \u2014 ${parts.join(", ")}`));
  } else if (warnings > 0) {
    lines.push(warning(`Result: PASSED WITH WARNINGS`) + dim(` \u2014 ${parts.join(", ")}`));
  } else {
    lines.push(success(`Result: PASSED`) + dim(` \u2014 ${parts.join(", ")}`));
  }

  lines.push("");

  // Detailed findings from annotations
  const checksWithFindings = results.checks.filter((c) => {
    const findings = (c.details as Record<string, unknown>)?.findings as unknown[];
    return findings && Array.isArray(findings) && findings.length > 0;
  });

  if (checksWithFindings.length > 0) {
    lines.push(bold("Findings"));
    lines.push(dim(SEPARATOR));

    for (const check of checksWithFindings) {
      lines.push("");
      lines.push(`${statusIcon(check.status)} ${bold(check.type)}`);

      const findings = (check.details as Record<string, unknown>).findings as Array<
        Record<string, unknown>
      >;

      for (const finding of findings) {
        // Map severity from engine formats to display
        const sev = String(finding.severity || "info").toLowerCase();
        const severity =
          sev === "critical" || sev === "high" || sev === "error" || sev === "fail"
            ? error(sev.toUpperCase())
            : sev === "medium" || sev === "warning" || sev === "warn"
              ? warning(sev.toUpperCase())
              : dim("INFO");

        // Build location from file/line or commit
        const file = finding.file || finding.path;
        const line = finding.line || finding.start_line;
        const location = file
          ? dim(` ${file}${line ? `:${line}` : ""}`)
          : finding.commit
            ? dim(` commit:${finding.commit}`)
            : "";

        // Build message from various field names used by different checks
        const message =
          finding.issue ||           // commit_message check
          finding.pattern ||         // secrets check (pattern name)
          finding.details ||         // agent_patterns check
          (finding.blockedBy ? `Blocked pattern: ${finding.blockedBy}` : "") ||
          finding.message ||         // generic
          "";

        // Show redacted match for secrets if available
        const matchInfo = finding.match ? dim(` [${finding.match}]`) : "";

        lines.push(`  ${severity}${location} ${message}${matchInfo}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

export function formatResultsJson(results: CheckRunResults): string {
  return JSON.stringify(results, null, 2);
}
