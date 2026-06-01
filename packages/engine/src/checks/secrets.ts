import type { AddedLine, ChangedFile, CheckResult, FindingSeverity, SecretCheckConfig } from "../types";
import { SECRET_PATTERNS } from "../scanners/regex-patterns";
import { calculateEntropy, extractTokens } from "../scanners/entropy";
import { parseAddedLines } from "../diff/parse";
import { statusFromFindings } from "./status";

const DEFAULT_ENTROPY_THRESHOLD = 4.8;
const DEFAULT_ENTROPY_SEVERITY: FindingSeverity = "medium";

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".svg", ".webp",
  ".mp3", ".mp4", ".wav", ".avi", ".mov", ".mkv", ".webm",
  ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar", ".xz",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".exe", ".dll", ".so", ".dylib", ".bin",
  ".pyc", ".pyo", ".class", ".o", ".obj",
  ".sqlite", ".db", ".lock",
]);

function isBinaryFile(filename: string): boolean {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) return false;
  const ext = filename.substring(dotIndex).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

function redact(value: string): string {
  if (value.length <= 12) {
    return value.substring(0, 2) + "***" + value.substring(value.length - 2);
  }
  return value.substring(0, 4) + "***" + value.substring(value.length - 4);
}

interface Finding {
  file: string;
  line: number;
  pattern: string;
  match: string;
  severity: FindingSeverity;
}

export async function checkSecrets(
  files: ChangedFile[],
  config: SecretCheckConfig,
): Promise<CheckResult> {
  const findings: Finding[] = [];

  // Compile custom patterns if any
  const customPatterns = (config.custom_patterns ?? []).map((p) => ({
    name: p.name,
    pattern: new RegExp(p.pattern, "gi"),
    severity: (p.severity ?? "high") as "critical" | "high",
  }));

  const allPatterns = [...SECRET_PATTERNS, ...customPatterns];

  for (const file of files) {
    if (file.status === "removed") continue;
    if (isBinaryFile(file.path)) continue;

    // Scan only added lines, with REAL file line numbers. Never scan the patch as content —
    // that would flag context, removed lines, and diff metadata (index/@@/+++).
    const scanLines: AddedLine[] = file.addedLines
      ?? (file.patch ? parseAddedLines(file.patch) : addedLinesFromFullContent(file.content));

    for (const { lineNo, text } of scanLines) {
      const line = text;
      const lineNum = lineNo;

      // Check against all regex patterns
      for (const sp of allPatterns) {
        const pattern = new RegExp(sp.pattern.source, sp.pattern.flags.replace("g", "") + "g");
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(line)) !== null) {
          findings.push({
            file: file.path,
            line: lineNum,
            pattern: sp.name,
            match: redact(match[0]),
            severity: sp.severity,
          });
        }
      }

      // Entropy-based detection — skip lines that are clearly code, not secrets
      const trimmedLine = line.trim();
      const isCodeLine =
        trimmedLine.startsWith("import ") ||
        trimmedLine.startsWith("import{") ||
        trimmedLine.startsWith("export ") ||
        trimmedLine.startsWith("from ") ||
        trimmedLine.startsWith("require(") ||
        trimmedLine.startsWith("//") ||
        trimmedLine.startsWith("/*") ||
        trimmedLine.startsWith("* ") ||
        trimmedLine.startsWith("className=") ||
        trimmedLine.startsWith("class=") ||
        /^\s*\*/.test(trimmedLine) ||
        /^[\s})\];,]*$/.test(trimmedLine);

      if (!isCodeLine) {
        const entropyThreshold = config.entropy_threshold ?? DEFAULT_ENTROPY_THRESHOLD;
        const entropySeverity = config.entropy_severity ?? DEFAULT_ENTROPY_SEVERITY;
        const tokens = extractTokens(line);
        for (const token of tokens) {
          const entropy = calculateEntropy(token);
          if (entropy > entropyThreshold) {
            const alreadyFound = findings.some(
              (f) => f.file === file.path && f.line === lineNum,
            );
            if (!alreadyFound) {
              findings.push({
                file: file.path,
                line: lineNum,
                pattern: "High Entropy String",
                match: redact(token),
                severity: entropySeverity,
              });
            }
          }
        }
      }
    }
  }

  return buildResult(findings, config);
}

function buildResult(findings: Finding[], config: SecretCheckConfig): CheckResult {
  const hasCritical = findings.some((f) => f.severity === "critical");
  const hasHigh = findings.some((f) => f.severity === "high");

  const summary = findings.length === 0
    ? "No secrets detected"
    : `Found ${findings.length} potential secret(s)${hasCritical ? " including CRITICAL" : hasHigh ? " including HIGH severity" : ""}`;

  return {
    type: "secrets",
    status: statusFromFindings(findings, { severity: config.severity }),
    title: "Secret Scanner",
    summary,
    details: {
      findings,
      count: findings.length,
    },
  };
}

function addedLinesFromFullContent(content: string): AddedLine[] {
  if (!content) return [];
  return content.split("\n").map((text, i) => ({ lineNo: i + 1, text }));
}
