// Map LastGate findings to VS Code diagnostic format

export interface Finding {
  file: string;
  line?: number;
  message: string;
  checkType: string;
  status: "fail" | "warn";
}

export interface DiagnosticEntry {
  file: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  message: string;
  severity: "error" | "warning" | "information";
  source: string;
}

export function mapFindingToDiagnostic(finding: Finding): DiagnosticEntry {
  const line = Math.max((finding.line || 1) - 1, 0); // 0-indexed

  return {
    file: finding.file,
    line,
    column: 0,
    endLine: line,
    endColumn: Number.MAX_SAFE_INTEGER,
    message: `[${finding.checkType}] ${finding.message}`,
    severity: finding.status === "fail" ? "error" : "warning",
    source: "LastGate",
  };
}

export function groupFindingsByFile(findings: Finding[]): Map<string, Finding[]> {
  const grouped = new Map<string, Finding[]>();
  for (const finding of findings) {
    const existing = grouped.get(finding.file) || [];
    existing.push(finding);
    grouped.set(finding.file, existing);
  }
  return grouped;
}
