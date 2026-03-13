import type { CommitInfo, CheckResult, DuplicateCheckConfig } from "../types";

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);

  for (let j = 0; j <= n; j++) {
    prev[j] = j;
  }

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

function normalizeMessage(msg: string): string {
  return msg.trim().toLowerCase();
}

interface DuplicateFinding {
  commit: string;
  message: string;
  matchedCommit: string;
  matchedMessage: string;
  type: "identical" | "near-identical" | "revert";
  similarity: number;
}

export async function checkDuplicates(
  commits: CommitInfo[],
  previousCommits: CommitInfo[],
  config: DuplicateCheckConfig,
): Promise<CheckResult> {
  const findings: DuplicateFinding[] = [];
  const lookback = config.lookback ?? 10;

  const recentPrevious = previousCommits.slice(0, lookback);

  for (const commit of commits) {
    const normalizedMsg = normalizeMessage(commit.message);

    // Check against previous commits for duplicates
    for (const prev of recentPrevious) {
      const prevNormalized = normalizeMessage(prev.message);

      if (normalizedMsg === prevNormalized) {
        findings.push({
          commit: commit.sha,
          message: commit.message,
          matchedCommit: prev.sha,
          matchedMessage: prev.message,
          type: "identical",
          similarity: 1,
        });
        continue;
      }

      const sim = similarity(normalizedMsg, prevNormalized);
      if (sim > 0.8) {
        findings.push({
          commit: commit.sha,
          message: commit.message,
          matchedCommit: prev.sha,
          matchedMessage: prev.message,
          type: "near-identical",
          similarity: sim,
        });
      }
    }

    // Check for revert patterns
    const revertMatch = commit.message.match(/^revert\s+["']?(.+?)["']?\s*$/i)
      ?? commit.message.match(/^Revert\s+"(.+)"$/);

    if (revertMatch) {
      const revertedMsg = normalizeMessage(revertMatch[1]);
      for (const prev of recentPrevious) {
        const prevNormalized = normalizeMessage(prev.message);
        if (similarity(revertedMsg, prevNormalized) > 0.8) {
          findings.push({
            commit: commit.sha,
            message: commit.message,
            matchedCommit: prev.sha,
            matchedMessage: prev.message,
            type: "revert",
            similarity: 1,
          });
          break;
        }
      }
    }

    // Check within the current batch for duplicates
    for (const other of commits) {
      if (other.sha === commit.sha) continue;
      const otherNormalized = normalizeMessage(other.message);
      if (normalizedMsg === otherNormalized) {
        const alreadyFound = findings.some(
          (f) =>
            (f.commit === other.sha && f.matchedCommit === commit.sha) ||
            (f.commit === commit.sha && f.matchedCommit === other.sha),
        );
        if (!alreadyFound) {
          findings.push({
            commit: commit.sha,
            message: commit.message,
            matchedCommit: other.sha,
            matchedMessage: other.message,
            type: "identical",
            similarity: 1,
          });
        }
      }
    }
  }

  const summary = findings.length === 0
    ? "No duplicate commits detected"
    : `Found ${findings.length} duplicate/revert commit(s)`;

  return {
    type: "duplicates",
    status: findings.length > 0 ? "fail" : "pass",
    title: "Duplicate Commit Detector",
    summary,
    details: {
      findings,
      count: findings.length,
    },
  };
}
