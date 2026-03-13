import type { FixAction } from "../types";

const BLOCKED_PATTERNS = [
  { pattern: /^\.env($|\.)/, description: "environment file" },
  { pattern: /^\.DS_Store$/, description: ".DS_Store" },
  { pattern: /(^|\/)node_modules\//, description: "node_modules directory" },
  { pattern: /(^|\/)\.claude\//, description: ".claude directory" },
  { pattern: /(^|\/)__pycache__\//, description: "__pycache__ directory" },
  { pattern: /\.(pem|key)$/, description: "private key file" },
];

export function findBlockedFiles(
  files: { path: string; status: string }[]
): FixAction[] {
  const actions: FixAction[] = [];

  for (const file of files) {
    if (file.status === "deleted") continue;

    for (const { pattern, description } of BLOCKED_PATTERNS) {
      if (pattern.test(file.path)) {
        actions.push({
          type: "remove_file",
          file: file.path,
          description: `Remove ${description}: ${file.path}`,
        });
        break;
      }
    }
  }

  return actions;
}
