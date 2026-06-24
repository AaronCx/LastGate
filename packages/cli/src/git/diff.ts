import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { parseAddedLines, type ChangedFile } from "@lastgate/engine";

// node child_process (works under both node and bun) — the published CLI runs
// under node, where Bun.spawn does not exist.
function runGit(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("git", args, { maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(`git ${args[0]} failed: ${String(stderr).trim()}`));
      else resolve(stdout);
    });
  });
}

async function tryRunGit(args: string[]): Promise<string | undefined> {
  try {
    return await runGit(args);
  } catch {
    return undefined;
  }
}

function parseNameStatus(output: string): { status: string; path: string }[] {
  return output
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => {
      const [status, ...pathParts] = line.split("\t");
      return { status: status.trim(), path: pathParts.join("\t").trim() };
    });
}

function statusFromCode(code: string): ChangedFile["status"] {
  switch (code[0]) {
    case "A":
      return "added";
    case "D":
      return "removed";
    case "M":
      return "modified";
    case "R":
      return "renamed";
    default:
      return "modified";
  }
}

function splitPatchByFile(diffOutput: string): Map<string, string> {
  const map = new Map<string, string>();
  const chunks = diffOutput.split(/^diff --git /m).filter((c) => c.length > 0);
  for (const chunk of chunks) {
    const headerMatch = chunk.match(/^a\/(.+?) b\/(.+)/m);
    if (headerMatch) {
      const filePath = headerMatch[2];
      map.set(filePath, `diff --git ${chunk}`);
    }
  }
  return map;
}

/**
 * Build the ChangedFile list for a given diff. `readContent` resolves the real
 * post-change file content for a path; `staged` controls which git refspec to
 * pull body content from.
 */
async function buildChangedFiles(
  nameStatusEntries: { status: string; path: string }[],
  patches: Map<string, string>,
  readContent: (path: string) => Promise<string>,
): Promise<ChangedFile[]> {
  const out: ChangedFile[] = [];
  for (const entry of nameStatusEntries) {
    const status = statusFromCode(entry.status);
    const patch = patches.get(entry.path) ?? "";
    const content = status === "removed" ? "" : await readContent(entry.path);
    const addedLines = patch ? parseAddedLines(patch) : undefined;
    out.push({
      path: entry.path,
      status,
      content,
      patch,
      addedLines,
    });
  }
  return out;
}

export async function getStagedDiff(): Promise<ChangedFile[]> {
  const [nameStatusOutput, diffOutput] = await Promise.all([
    runGit(["diff", "--cached", "--name-status"]),
    runGit(["diff", "--cached"]),
  ]);

  const entries = parseNameStatus(nameStatusOutput);
  if (entries.length === 0) return [];

  const patches = splitPatchByFile(diffOutput);
  return buildChangedFiles(entries, patches, async (path) => {
    // For staged content, prefer the staged blob (`git show :path`). Falls back to the
    // working-tree file if the blob isn't readable (rare — e.g., partial stage on a new file).
    const staged = await tryRunGit(["show", `:${path}`]);
    if (staged !== undefined) return staged;
    try {
      return await readFile(path, "utf8");
    } catch {
      return "";
    }
  });
}

export async function getBranchDiff(branch: string): Promise<ChangedFile[]> {
  const mergeBase = (await runGit(["merge-base", branch, "HEAD"])).trim();

  const [nameStatusOutput, diffOutput] = await Promise.all([
    runGit(["diff", "--name-status", mergeBase, "HEAD"]),
    runGit(["diff", mergeBase, "HEAD"]),
  ]);

  const entries = parseNameStatus(nameStatusOutput);
  if (entries.length === 0) return [];

  const patches = splitPatchByFile(diffOutput);
  return buildChangedFiles(entries, patches, async (path) => {
    const head = await tryRunGit(["show", `HEAD:${path}`]);
    return head ?? "";
  });
}
