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

      const findings = (check.details as Record<string, unknown>).findings as Array<{
        severity?: string;
        file?: string;
        line?: number;
        message?: string;
      }>;

      for (const finding of findings) {
        const severity =
          finding.severity === "error"
            ? error("ERROR")
            : finding.severity === "warning"
              ? warning("WARN")
              : dim("INFO");

        const location = finding.file
          ? dim(` ${finding.file}${finding.line ? `:${finding.line}` : ""}`)
          : "";

        lines.push(`  ${severity}${location} ${finding.message || ""}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

export function formatResultsJson(results: CheckRunResults): string {
  return JSON.stringify(results, null, 2);
}
