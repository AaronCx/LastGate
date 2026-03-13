import type { FixAction } from "../types";

const DEFAULT_GITIGNORE_ENTRIES = [
  ".env",
  ".env.*",
  "!.env.example",
  ".DS_Store",
  "node_modules/",
  "__pycache__/",
  ".claude/",
  "*.pem",
  "*.key",
];

export function generateGitignoreUpdates(
  currentGitignore: string,
  removedFiles: { path: string }[]
): { entries: string[]; action: FixAction | null } {
  const existing = new Set(
    currentGitignore.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
  );

  const needed = new Set<string>();

  for (const file of removedFiles) {
    // Determine what gitignore pattern to add
    if (file.path.match(/^\.env/)) needed.add(".env");
    if (file.path === ".DS_Store") needed.add(".DS_Store");
    if (file.path.includes("node_modules/")) needed.add("node_modules/");
    if (file.path.includes("__pycache__/")) needed.add("__pycache__/");
    if (file.path.includes(".claude/")) needed.add(".claude/");
    if (file.path.endsWith(".pem")) needed.add("*.pem");
    if (file.path.endsWith(".key")) needed.add("*.key");
  }

  const toAdd = Array.from(needed).filter((e) => !existing.has(e));

  if (toAdd.length === 0) return { entries: [], action: null };

  return {
    entries: toAdd,
    action: {
      type: "update_gitignore",
      file: ".gitignore",
      description: `Add to .gitignore: ${toAdd.join(", ")}`,
    },
  };
}
