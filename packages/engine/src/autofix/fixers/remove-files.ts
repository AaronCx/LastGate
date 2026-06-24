import type { FixAction } from "../types";

const BLOCKED_PATTERNS = [
  { pattern: /(^|\/)\.DS_Store$/, description: ".DS_Store" },
  { pattern: /(^|\/)node_modules\//, description: "node_modules directory" },
  { pattern: /(^|\/)\.claude\//, description: ".claude directory" },
  { pattern: /(^|\/)__pycache__\//, description: "__pycache__ directory" },
  { pattern: /\.(pem|key)$/, description: "private key file" },
];

// .env at any depth (config/.env, not just root) — but NEVER the committed
// templates (.env.example / .sample / .template), which are meant to be tracked.
const ENV_FILE = /(^|\/)\.env(\.[^/]*)?$/;
const ENV_TEMPLATE = /\.(example|sample|template)$/i;

export function findBlockedFiles(
  files: { path: string; status: string }[]
): FixAction[] {
  const actions: FixAction[] = [];

  for (const file of files) {
    // Don't try to "remove" a file the diff already removed.
    if (file.status === "removed") continue;

    if (ENV_FILE.test(file.path) && !ENV_TEMPLATE.test(file.path)) {
      actions.push({
        type: "remove_file",
        file: file.path,
        description: `Remove environment file: ${file.path}`,
      });
      continue;
    }

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
