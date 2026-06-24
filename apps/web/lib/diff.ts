export interface ParsedDiffLine {
  type: "add" | "remove" | "context";
  lineNumber: number;
  content: string;
}
export interface ParsedFileDiff {
  filename: string;
  lines: ParsedDiffLine[];
}

/**
 * Concatenate per-file patches (GitHub/git `patch` = hunks only) into one stored
 * unified diff, adding the `diff --git` / `---` / `+++` headers so it round-trips
 * through parseUnifiedDiff. Files with no patch (content-only producers) are
 * skipped.
 */
export function buildUnifiedDiff(
  files: Array<{ path?: string; filename?: string; patch?: string }>,
): string {
  const parts: string[] = [];
  for (const f of files) {
    const path = f.path || f.filename;
    if (!path || !f.patch) continue;
    parts.push(`diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n${f.patch}`);
  }
  return parts.join("\n");
}

/** Parse a stored unified diff into per-file line arrays for <DiffViewer>. */
export function parseUnifiedDiff(diff: string): ParsedFileDiff[] {
  if (!diff) return [];
  const files: ParsedFileDiff[] = [];
  let current: ParsedFileDiff | null = null;
  let newLine = 0;
  let oldLine = 0;

  const newFile = (name: string): ParsedFileDiff => {
    const f: ParsedFileDiff = { filename: name, lines: [] };
    files.push(f);
    return f;
  };

  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git")) {
      const m = line.match(/ b\/(.+)$/);
      current = newFile(m ? m[1] : "file");
      continue;
    }
    if (line.startsWith("+++ b/")) {
      const name = line.slice(6);
      if (current) current.filename = name;
      else current = newFile(name);
      continue;
    }
    if (line.startsWith("--- ") || line.startsWith("index ")) continue;

    const hunk = line.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
    if (hunk) {
      if (!current) current = newFile("changed");
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      continue;
    }
    if (!current) continue; // preamble before any file/hunk

    const c = line[0];
    if (c === "+") {
      current.lines.push({ type: "add", lineNumber: newLine++, content: line.slice(1) });
    } else if (c === "-") {
      current.lines.push({ type: "remove", lineNumber: oldLine++, content: line.slice(1) });
    } else if (c === " ") {
      current.lines.push({ type: "context", lineNumber: newLine, content: line.slice(1) });
      newLine++;
      oldLine++;
    }
    // ignore blank lines and the "\ No newline at end of file" sentinel
  }
  return files;
}
