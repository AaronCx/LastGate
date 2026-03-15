import { execFile } from "node:child_process";
import type { ChangedFile, CheckResult, DependencyCheckConfig } from "../types";

async function runCommand(command: string, cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const parts = command.split(/\s+/);
  const [cmd, ...args] = parts;

  return new Promise((resolve) => {
    const child = execFile(cmd, args, {
      cwd: cwd ?? process.cwd(),
      maxBuffer: 10 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      resolve({
        exitCode: error ? (child.exitCode ?? 1) : 0,
        stdout: stdout || "",
        stderr: stderr || "",
      });
    });
  });
}

interface VulnerabilityFinding {
  package: string;
  severity: string;
  title: string;
  url?: string;
}

function parseNpmAuditJson(output: string): VulnerabilityFinding[] {
  const findings: VulnerabilityFinding[] = [];
  try {
    const data = JSON.parse(output);

    if (data.vulnerabilities) {
      for (const [pkg, info] of Object.entries(data.vulnerabilities)) {
        const vuln = info as { severity: string; via: Array<{ title?: string; url?: string }> };
        const via = Array.isArray(vuln.via) ? vuln.via[0] : undefined;
        findings.push({
          package: pkg,
          severity: vuln.severity ?? "unknown",
          title: (via && typeof via === "object" && via.title) ? via.title : `Vulnerability in ${pkg}`,
          url: via && typeof via === "object" ? via.url : undefined,
        });
      }
    }

    if (data.advisories) {
      for (const advisory of Object.values(data.advisories)) {
        const adv = advisory as { module_name: string; severity: string; title: string; url: string };
        findings.push({
          package: adv.module_name,
          severity: adv.severity,
          title: adv.title,
          url: adv.url,
        });
      }
    }
  } catch {
    // Non-JSON output
  }
  return findings;
}

export async function checkDependencies(
  files: ChangedFile[],
  config: DependencyCheckConfig,
): Promise<CheckResult> {
  const cwd = (config as DependencyCheckConfig & { cwd?: string }).cwd ?? process.cwd();
  const issues: Array<{ message: string; severity: string; file?: string }> = [];

  const changedPaths = files.map((f) => f.path);

  const packageJsonChanged = changedPaths.some((f) =>
    f === "package.json" || f.endsWith("/package.json"),
  );
  const requirementsTxtChanged = changedPaths.some((f) =>
    f === "requirements.txt" || f.endsWith("/requirements.txt"),
  );

  if (!packageJsonChanged && !requirementsTxtChanged) {
    return {
      type: "dependencies",
      status: "pass",
      title: "Dependency Auditor",
      summary: "No dependency files changed",
      details: { skipped: true },
    };
  }

  if (packageJsonChanged) {
    const lockfileChanged = changedPaths.some((f) =>
      f === "bun.lockb" || f === "bun.lock" ||
      f === "package-lock.json" || f === "yarn.lock" || f === "pnpm-lock.yaml" ||
      f.endsWith("/bun.lockb") || f.endsWith("/bun.lock") ||
      f.endsWith("/package-lock.json") || f.endsWith("/yarn.lock") || f.endsWith("/pnpm-lock.yaml"),
    );

    if (!lockfileChanged) {
      issues.push({
        message: "package.json changed but lockfile was not updated. Run your package manager to update the lockfile.",
        severity: "high",
        file: "package.json",
      });
    }

    // Run audit
    let auditFindings: VulnerabilityFinding[] = [];

    try {
      let auditResult = await runCommand("bun pm audit", cwd);
      if (auditResult.exitCode !== 0) {
        try {
          auditResult = await runCommand("npm audit --json", cwd);
          auditFindings = parseNpmAuditJson(auditResult.stdout);
        } catch {
          if (auditResult.stdout.trim() || auditResult.stderr.trim()) {
            issues.push({
              message: `Audit output: ${(auditResult.stdout + auditResult.stderr).trim().substring(0, 500)}`,
              severity: "medium",
            });
          }
        }
      }
    } catch {
      issues.push({
        message: "Could not run dependency audit (neither bun pm audit nor npm audit available)",
        severity: "low",
      });
    }

    const failOn = config.fail_on ?? "critical";
    const severityOrder = ["low", "moderate", "high", "critical"];
    const failThreshold = severityOrder.indexOf(failOn);

    for (const vuln of auditFindings) {
      const vulnLevel = severityOrder.indexOf(vuln.severity);
      const isBlocking = vulnLevel >= failThreshold;

      issues.push({
        message: `${vuln.severity.toUpperCase()}: ${vuln.package} - ${vuln.title}${vuln.url ? ` (${vuln.url})` : ""}`,
        severity: isBlocking ? "high" : "medium",
      });
    }
  }

  if (requirementsTxtChanged) {
    issues.push({
      message: "requirements.txt changed. Consider running a vulnerability scan (e.g., pip-audit).",
      severity: "low",
    });
  }

  const hasBlocking = issues.some((f) => f.severity === "high" || f.severity === "critical");

  return {
    type: "dependencies",
    status: hasBlocking ? "fail" : issues.length > 0 ? "warn" : "pass",
    title: "Dependency Auditor",
    summary: issues.length === 0
      ? "Dependency check passed"
      : `Found ${issues.length} dependency issue(s)`,
    details: {
      findings: issues.map(i => ({
        file: i.file,
        message: i.message,
        severity: i.severity,
      })),
      issues,
      count: issues.length,
    },
  };
}
