import type { ChangedFile } from "@lastgate/engine";

async function runGit(args: string[]): Promise<string> {
  const proc = Bun.spawn(["git", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`git ${args[0]} failed: ${stderr.trim()}`);
  }

  return stdout;
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

function parseDiffContent(
  diffOutput: string,
  nameStatusEntries: { status: string; path: string }[]
): ChangedFile[] {
  const fileMap = new Map<string, string>();

  // Split the diff into per-file chunks
  const fileChunks = diffOutput.split(/^diff --git /m).filter((c) => c.length > 0);

  for (const chunk of fileChunks) {
    // Extract the file path from the diff header: a/path b/path
    const headerMatch = chunk.match(/^a\/(.+?) b\/(.+)/m);
    if (headerMatch) {
      const filePath = headerMatch[2];
      fileMap.set(filePath, `diff --git ${chunk}`);
    }
  }

  return nameStatusEntries.map((entry) => {
    let status: ChangedFile["status"];
    switch (entry.status[0]) {
      case "A":
        status = "added";
        break;
      case "D":
        status = "removed";
        break;
      case "M":
        status = "modified";
        break;
      case "R":
        status = "renamed";
        break;
      default:
        status = "modified";
    }

    const patch = fileMap.get(entry.path) || "";

    return {
      path: entry.path,
      status,
      content: patch,
      patch,
    };
  });
}

export async function getStagedDiff(): Promise<ChangedFile[]> {
  const [nameStatusOutput, diffOutput] = await Promise.all([
    runGit(["diff", "--cached", "--name-status"]),
    runGit(["diff", "--cached"]),
  ]);

  const entries = parseNameStatus(nameStatusOutput);
  if (entries.length === 0) {
    return [];
  }

  return parseDiffContent(diffOutput, entries);
}

export async function getBranchDiff(branch: string): Promise<ChangedFile[]> {
  const mergeBase = (await runGit(["merge-base", branch, "HEAD"])).trim();

  const [nameStatusOutput, diffOutput] = await Promise.all([
    runGit(["diff", "--name-status", mergeBase, "HEAD"]),
    runGit(["diff", mergeBase, "HEAD"]),
  ]);

  const entries = parseNameStatus(nameStatusOutput);
  if (entries.length === 0) {
    return [];
  }

  return parseDiffContent(diffOutput, entries);
}
