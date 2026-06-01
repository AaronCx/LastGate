export interface AddedLine {
  lineNo: number;
  text: string;
}

const HUNK_HEADER_RE = /^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/;

/**
 * Parse a unified-diff patch and return every line that was *added* (`+` prefix
 * inside a hunk body), tagged with its real new-file line number.
 *
 * Skips:
 *   - File-metadata lines (`diff --git`, `index ...`, `+++ b/...`, `--- a/...`).
 *   - Context lines (` ` prefix). They advance the new-file line counter but are not emitted.
 *   - Removed lines (`-` prefix). They neither advance the counter nor emit.
 *   - The `\ No newline at end of file` sentinel.
 *
 * Reads each hunk's `@@ -a,b +c,d @@` header to set the starting new-file line.
 */
export function parseAddedLines(patch: string): AddedLine[] {
  if (!patch) return [];
  const out: AddedLine[] = [];
  const lines = patch.split("\n");

  let inHunk = false;
  let newLineNo = 0;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      const m = HUNK_HEADER_RE.exec(line);
      if (m) {
        newLineNo = Number(m[1]);
        inHunk = true;
      } else {
        inHunk = false;
      }
      continue;
    }

    if (!inHunk) continue;

    // Anything starting with one of these is file metadata that should never be inside a hunk;
    // if we see it, we've left the hunk body and shouldn't process content lines until the next @@.
    if (line.startsWith("diff --git") || line.startsWith("index ") ||
        line.startsWith("+++ ") || line.startsWith("--- ")) {
      inHunk = false;
      continue;
    }

    if (line.startsWith("\\")) {
      // "\ No newline at end of file" sentinel — neither advances counter nor emits.
      continue;
    }

    const prefix = line[0];
    if (prefix === "+") {
      out.push({ lineNo: newLineNo, text: line.slice(1) });
      newLineNo++;
    } else if (prefix === "-") {
      // removed; do not advance new-file counter
    } else if (prefix === " " || line === "") {
      // context line (note: a fully-empty line in a hunk body represents a blank line — still advances)
      newLineNo++;
    } else {
      // Unknown prefix — leave hunk state defensively. The next @@ resumes parsing.
      inHunk = false;
    }
  }

  return out;
}
