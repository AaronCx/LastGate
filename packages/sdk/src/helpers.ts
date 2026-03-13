import type { ChangedFile } from "./types";

export function matchFiles(files: ChangedFile[], pattern: string): ChangedFile[] {
  // Convert simple glob to regex
  const regexStr = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/\{\{GLOBSTAR\}\}/g, ".*");
  const regex = new RegExp(`^${regexStr}$`);
  return files.filter((f) => regex.test(f.path));
}

export function findPattern(
  content: string,
  regex: RegExp
): { line: number; match: string }[] {
  const lines = content.split("\n");
  const results: { line: number; match: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(regex);
    if (m) {
      results.push({ line: i + 1, match: m[0] });
    }
  }
  return results;
}

export function isTestFile(path: string): boolean {
  return (
    path.includes("__tests__") ||
    path.includes(".test.") ||
    path.includes(".spec.") ||
    path.includes("/test/") ||
    path.includes("/tests/")
  );
}

export function isSourceFile(path: string, extensions: string[] = [".ts", ".tsx", ".js", ".jsx"]): boolean {
  return extensions.some((ext) => path.endsWith(ext)) && !isTestFile(path);
}
