import type { CheckRunResults, CheckResult } from "@lastgate/engine";

export function buildPRComment(results: CheckRunResults, dashboardUrl: string): string {
  const { checks } = results;
  const failed = checks.filter(c => c.status === "fail");
  const warned = checks.filter(c => c.status === "warn");
  const passed = checks.filter(c => c.status === "pass");

  let comment = `## 🛡 LastGate Pre-flight Report\n\n`;

  // Status summary
  const parts: string[] = [];
  if (failed.length > 0) parts.push(`❌ ${failed.length} failed`);
  if (warned.length > 0) parts.push(`⚠️ ${warned.length} warning${warned.length > 1 ? 's' : ''}`);
  if (passed.length > 0) parts.push(`✅ ${passed.length} passed`);
  comment += `**Status:** ${parts.join(', ')} | [View in Dashboard](${dashboardUrl})\n\n`;

  comment += `---\n\n`;

  // Failed checks with full detail
  for (const check of failed) {
    comment += `### ❌ ${check.type.toUpperCase()}\n\n`;
    comment += renderCheckFindings(check);
    comment += `\n---\n\n`;
  }

  // Warned checks with full detail
  for (const check of warned) {
    comment += `### ⚠️ ${check.type.toUpperCase()}\n\n`;
    comment += renderCheckFindings(check);
    comment += `\n---\n\n`;
  }

  // Passed checks summary table
  if (passed.length > 0) {
    comment += `### ✅ Passed Checks\n\n`;
    comment += `| Check | Result | Duration |\n|-------|--------|----------|\n`;
    for (const check of passed) {
      const duration = check.duration_ms ? `${(check.duration_ms / 1000).toFixed(1)}s` : '-';
      comment += `| ${check.type} | ${check.title} | ${duration} |\n`;
    }
    comment += `\n---\n\n`;
  }

  // ALWAYS append agent feedback section
  comment += buildAgentFeedbackSection(failed, warned);

  return comment;
}

function renderCheckFindings(check: CheckResult): string {
  let out = "";
  const findings = (check.details as Record<string, unknown>)?.findings as Array<Record<string, unknown>> | undefined;

  if (check.type === "secrets" && findings && findings.length > 0) {
    out += `| File | Line | Pattern | Detail |\n|------|------|---------|--------|\n`;
    for (const f of findings) {
      out += `| \`${f.file}\` | ${f.line || '–'} | ${f.pattern || '–'} | \`${f.match || '–'}\` |\n`;
    }
    out += `\n> ⚠️ **Action required:** Rotate any exposed keys immediately. Move secrets to environment variables.\n`;
  }

  else if (check.type === "lint" && findings && findings.length > 0) {
    out += `| File | Line | Rule | Message |\n|------|------|------|---------|\n`;
    for (const f of findings) {
      out += `| \`${f.file}\` | ${f.line || '–'} | \`${f.rule || '–'}\` | ${f.message} |\n`;
    }
  }

  else if (check.type === "commit_message") {
    out += `${check.title}\n\n`;
    const details = check.details as Record<string, unknown>;
    if (details?.received) {
      out += `- **Received:** \`${details.received}\`\n`;
      out += `- **Expected:** \`type(scope): description\`\n`;
      out += `- **Examples:** \`feat: add user auth\`, \`fix: resolve race condition\`\n`;
    }
  }

  else if (check.type === "build") {
    out += `${check.title}\n\n`;
    const details = check.details as Record<string, unknown>;
    if (details?.output) {
      out += `\`\`\`\n${(details.output as string).slice(0, 1000)}\n\`\`\`\n`;
    }
  }

  else if (check.type === "file_patterns" && findings && findings.length > 0) {
    out += `| File | Reason |\n|------|--------|\n`;
    for (const f of findings) {
      out += `| \`${f.file}\` | ${f.message || f.blockedBy || ''} |\n`;
    }
  }

  else if (findings && findings.length > 0) {
    // Generic table for any other check type
    out += `| File | Line | Message |\n|------|------|---------|\n`;
    for (const f of findings) {
      out += `| \`${f.file || f.commit || ''}\` | ${f.line || '–'} | ${f.issue || f.message || f.details || ''} |\n`;
    }
  }

  else {
    out += `${check.title}\n`;
  }

  return out;
}

function buildAgentFeedbackSection(
  failed: CheckResult[],
  warned: CheckResult[]
): string {
  // ALWAYS generate this section — no config check, no toggle
  if (failed.length === 0 && warned.length === 0) {
    return `<!-- lastgate:feedback -->\n## Agent Instructions\n\nAll checks passed. No issues to fix.\n<!-- /lastgate:feedback -->\n`;
  }

  let section = `<!-- lastgate:feedback -->\n## Agent Instructions\n\n`;
  section += `The following issues must be resolved before this can be merged:\n\n`;

  for (const check of [...failed, ...warned]) {
    const severity = check.status === "fail" ? "FAIL" : "WARN";
    section += `### ${check.type.toUpperCase()} (${severity})\n`;

    const findings = (check.details as Record<string, unknown>)?.findings as Array<Record<string, unknown>> | undefined;

    if (findings && findings.length > 0) {
      for (const finding of findings) {
        const location = (finding as Record<string, unknown>).line
          ? `File: \`${finding.file}\`, Line ${finding.line}`
          : (finding as Record<string, unknown>).file
            ? `File: \`${finding.file}\``
            : (finding as Record<string, unknown>).commit
              ? `Commit: \`${(finding.commit as string).substring(0, 7)}\``
              : '';
        section += `- ${location}\n`;
        // Prefer issue (commit_message), then message, then pattern (secrets)
        section += `  - Issue: ${finding.issue || finding.message || finding.pattern || ''}\n`;
        section += `  - Fix: ${finding.suggestedFix || "Review and resolve this issue"}\n`;
      }
    } else {
      // Checks that don't have findings array
      section += `- Issue: ${check.title}\n`;
      const details = check.details as Record<string, unknown>;
      if (details?.received) {
        section += `  - Received: "${details.received}"\n`;
        section += `  - Fix: Amend the commit message to follow conventional commits format.\n`;
      } else {
        section += `  - Fix: Review and resolve this issue\n`;
      }
    }

    section += `\n`;
  }

  section += `<!-- /lastgate:feedback -->\n`;
  return section;
}
