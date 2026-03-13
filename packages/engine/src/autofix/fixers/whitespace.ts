import type { FixAction } from "../types";

export function findTrailingWhitespace(
  files: { path: string; content: string; status: string }[]
): FixAction[] {
  const actions: FixAction[] = [];

  for (const file of files) {
    if (file.status === "deleted") continue;
    if (!file.content) continue;

    const lines = file.content.split("\n");
    const hasTrailing = lines.some((line) => /\s+$/.test(line));

    if (hasTrailing) {
      actions.push({
        type: "fix_whitespace",
        file: file.path,
        description: `Remove trailing whitespace in ${file.path}`,
      });
    }
  }

  return actions;
}

export function fixTrailingWhitespace(content: string): string {
  return content
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n");
}

export function findMissingEofNewline(
  files: { path: string; content: string; status: string }[]
): FixAction[] {
  const actions: FixAction[] = [];

  for (const file of files) {
    if (file.status === "deleted") continue;
    if (!file.content) continue;

    if (file.content.length > 0 && !file.content.endsWith("\n")) {
      actions.push({
        type: "fix_eof",
        file: file.path,
        description: `Add missing newline at end of ${file.path}`,
      });
    }
  }

  return actions;
}

export function fixEofNewline(content: string): string {
  if (content.length > 0 && !content.endsWith("\n")) {
    return content + "\n";
  }
  return content;
}
