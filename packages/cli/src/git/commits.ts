import type { CommitInfo } from "@lastgate/engine";

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

const LOG_FORMAT = "%H%n%an%n%ae%n%s%n%b%n---END---";

function parseLogOutput(output: string): CommitInfo[] {
  const commits: CommitInfo[] = [];
  const entries = output.split("---END---\n").filter((e) => e.trim().length > 0);

  for (const entry of entries) {
    const lines = entry.trim().split("\n");
    if (lines.length < 4) continue;

    const [hash, authorName, authorEmail, subject, ...bodyLines] = lines;

    commits.push({
      sha: hash.trim(),
      author: `${authorName.trim()} <${authorEmail.trim()}>`,
      message: subject.trim(),
      timestamp: new Date().toISOString(),
    });
  }

  return commits;
}

export async function getRecentCommits(count: number): Promise<CommitInfo[]> {
  const output = await runGit([
    "log",
    `-${count}`,
    `--format=${LOG_FORMAT}`,
  ]);

  return parseLogOutput(output);
}

export async function getCurrentCommitInfo(): Promise<CommitInfo> {
  const commits = await getRecentCommits(1);

  if (commits.length === 0) {
    throw new Error("No commits found in repository");
  }

  return commits[0];
}
