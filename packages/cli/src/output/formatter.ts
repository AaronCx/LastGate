import type { CheckRunResults, CheckResult } from "@lastgate/engine";
import { success, error, warning, dim, bold, PASS, FAIL, WARN } from "./colors";
import chalk from "chalk";

const SEPARATOR = "━".repeat(58);

function statusIcon(status: "pass" | "fail" | "warn"): string {
  switch (status) {
    case "pass": return success("✓");
    case "fail": return error("✗");
    case "warn": return warning("△");
  }
}

function statusLabel(status: "pass" | "fail" | "warn"): string {
  switch (status) {
    case "pass": return success("PASS");
    case "fail": return error("FAIL");
    case "warn": return warning("WARN");
  }
}

export function formatCheckResults(results: CheckRunResults): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(bold(" LastGate Pre-flight Check"));
  lines.push(dim(` ${SEPARATOR}`));
  lines.push("");

  for (const check of results.checks) {
    const icon = statusIcon(check.status);
    const duration = check.duration_ms ? ` (${(check.duration_ms / 1000).toFixed(1)}s)` : "";
    const checkName = check.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    lines.push(` ${icon} ${checkName.padEnd(22)} ${check.title}${duration}  ${statusLabel(check.status)}`);

    // Findings (indented under the check)
    const findings = (check.details as Record<string, unknown>)?.findings as Array<Record<string, unknown>> | undefined;

    if (findings && findings.length > 0) {
      findings.forEach((finding, i) => {
        const isLast = i === findings.length - 1;
        const branch = isLast ? "└─" : "├─";
        const location = (finding as Record<string, unknown>).line
          ? `${finding.file}:${finding.line}`
          : (finding as Record<string, unknown>).file
            ? String(finding.file)
            : (finding as Record<string, unknown>).commit
              ? `commit:${(finding.commit as string).substring(0, 7)}`
              : "";
        const detail = (finding as Record<string, unknown>).rule
          ? `${finding.rule} — ${finding.message}`
          : (finding as Record<string, unknown>).pattern
            ? `${finding.pattern} (${finding.match || ""})`
            : (finding as Record<string, unknown>).issue
              ? String(finding.issue)
              : (finding as Record<string, unknown>).message
                ? String(finding.message)
                : (finding as Record<string, unknown>).blockedBy
                  ? `Blocked pattern: ${finding.blockedBy}`
                  : (finding as Record<string, unknown>).details
                    ? String(finding.details)
                    : "";

        lines.push(dim(`     ${branch} `) + chalk.cyan(location.padEnd(30)) + ` ${detail}`);
      });
    }

    // Commit message detail
    if (check.type === "commit_message" && (check.details as Record<string, unknown>)?.received) {
      lines.push(dim(`     └─ `) + `Received: "${(check.details as Record<string, unknown>).received}" → Expected: type(scope): description`);
    }

    // Build output on failure
    if (check.type === "build" && check.status === "fail" && (check.details as Record<string, unknown>)?.output) {
      const outputLines = ((check.details as Record<string, unknown>).output as string).split("\n").slice(0, 5); // First 5 lines
      for (const line of outputLines) {
        lines.push(dim(`     │  `) + chalk.red(line));
      }
    }

    // What was checked (for passing checks)
    if (check.status === "pass" && (check.details as Record<string, unknown>)?.checked) {
      const checked = (check.details as Record<string, unknown>).checked as string[];
      lines.push(dim(`     Checked: ${checked.join(", ")}`));
    }

    lines.push(""); // Spacing between checks
  }

  // Summary
  lines.push(dim(` ${SEPARATOR}`));

  const failCount = results.checks.filter(c => c.status === "fail").length;
  const warnCount = results.checks.filter(c => c.status === "warn").length;
  const passCount = results.checks.filter(c => c.status === "pass").length;

  if (failCount > 0) {
    lines.push(chalk.red.bold(`Result: BLOCKED — ${failCount} failed, ${warnCount} warning${warnCount !== 1 ? 's' : ''}, ${passCount} passed`));
  } else if (warnCount > 0) {
    lines.push(chalk.yellow.bold(`Result: PASSED WITH WARNINGS — ${warnCount} warning${warnCount !== 1 ? 's' : ''}, ${passCount} passed`));
  } else {
    lines.push(chalk.green.bold(`Result: ALL CLEAR — ${passCount} passed`));
  }

  // Actionable fix list
  const allFailFindings: Array<Record<string, unknown>> = results.checks
    .filter(c => c.status === "fail")
    .flatMap(c => ((c.details as Record<string, unknown>)?.findings as Array<Record<string, unknown>> || []).map(f => ({ type: c.type, ...f })));

  const allWarnFindings: Array<Record<string, unknown>> = results.checks
    .filter(c => c.status === "warn")
    .flatMap(c => {
      const details = c.details as Record<string, unknown>;
      if ((details?.findings as unknown[])?.length) return ((details.findings as Array<Record<string, unknown>>)).map(f => ({ type: c.type, ...f }));
      if (details?.received) return [{ type: c.type, message: `Amend message to conventional format: feat|fix|chore: description`, file: "", line: undefined } as Record<string, unknown>];
      return [{ type: c.type, message: c.title, file: "", line: undefined } as Record<string, unknown>];
    });

  if (allFailFindings.length > 0) {
    lines.push("");
    lines.push(chalk.red(" Failures:"));
    for (const f of allFailFindings) {
      const location = f.line ? `${f.file}:${f.line}` : f.file || "";
      const fix = f.suggestedFix || f.message || f.issue || f.pattern || "";
      lines.push(`    ${chalk.red(String(f.type).toUpperCase().padEnd(17))} ${chalk.cyan(String(location).padEnd(30))} — ${fix}`);
    }
  }

  if (allWarnFindings.length > 0) {
    lines.push("");
    lines.push(chalk.yellow(" Warnings:"));
    for (const f of allWarnFindings) {
      const location = f.line ? `${f.file}:${f.line}` : f.file || "";
      const fix = f.suggestedFix || f.message || f.issue || f.pattern || "";
      lines.push(`    ${chalk.yellow(String(f.type).toUpperCase().padEnd(17))} ${chalk.cyan(String(location).padEnd(30))} — ${fix}`);
    }
  }

  if (failCount > 0 || warnCount > 0) {
    lines.push("");
    lines.push(dim("Fix these issues before pushing."));
  }

  lines.push("");
  return lines.join("\n");
}

export function formatResultsJson(results: CheckRunResults): string {
  return JSON.stringify(results, null, 2);
}
