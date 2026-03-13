import type { CommitInfo, CheckResult, CommitMessageCheckConfig } from "../types";

const CONVENTIONAL_COMMIT_PATTERN =
  /^(feat|fix|chore|docs|style|refactor|perf|test|ci|build|revert)(\(.+\))?!?:\s.+/;

const GENERIC_MESSAGES = new Set([
  "update", "fix", "changes", "wip", "asdf", "test",
  "tmp", "temp", "stuff", "misc", "minor", "commit",
  "save", "push", "done", ".", "-", "ok",
  "fixed", "updated", "changed", "tweaks", "cleanup",
]);

const MAX_MESSAGE_LENGTH = 500;

interface CommitFinding {
  commit: string;
  message: string;
  issue: string;
  severity: "high" | "medium" | "low";
}

function containsCodeOrStackTrace(message: string): boolean {
  if (/`.{10,}`/.test(message)) return true;
  if (/\bError:\s/.test(message)) return true;
  if (/\bat line\b/i.test(message)) return true;
  if (/\bat\s+\S+\s+\(.+:\d+:\d+\)/.test(message)) return true;
  if (/\s+at\s+.+\.(js|ts|py|go|rs|java):\d+/.test(message)) return true;
  return false;
}

export async function checkCommitMessage(
  commits: CommitInfo[],
  config: CommitMessageCheckConfig,
): Promise<CheckResult> {
  const findings: CommitFinding[] = [];
  const requireConventional = config.require_conventional ?? true;

  for (const commit of commits) {
    const message = commit.message.trim();
    const firstLine = message.split("\n")[0].trim();
    const sha = commit.sha.substring(0, 7);

    if (requireConventional && !CONVENTIONAL_COMMIT_PATTERN.test(firstLine)) {
      findings.push({
        commit: sha,
        message: firstLine,
        issue: `Commit does not follow conventional format (e.g., "feat: add feature", "fix(scope): resolve bug")`,
        severity: "medium",
      });
    }

    const normalizedFirst = firstLine.toLowerCase().trim();
    if (GENERIC_MESSAGES.has(normalizedFirst)) {
      findings.push({
        commit: sha,
        message: firstLine,
        issue: `Generic commit message "${firstLine}" -- please provide a meaningful description`,
        severity: "high",
      });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      findings.push({
        commit: sha,
        message: firstLine,
        issue: `Commit message is suspiciously long (${message.length} chars). Consider summarizing in the first line and using the body for details.`,
        severity: "low",
      });
    }

    if (containsCodeOrStackTrace(message)) {
      findings.push({
        commit: sha,
        message: firstLine,
        issue: "Commit message appears to contain code or stack traces. Keep commit messages descriptive, not technical dumps.",
        severity: "medium",
      });
    }

    if (firstLine.length < 3) {
      findings.push({
        commit: sha,
        message: firstLine || "(empty)",
        issue: "Commit message is too short to be meaningful",
        severity: "high",
      });
    }
  }

  return {
    type: "commit_message",
    status: findings.length > 0 ? "fail" : "pass",
    title: "Commit Message Validator",
    summary: findings.length === 0
      ? "All commit messages look good"
      : `Found ${findings.length} commit message issue(s)`,
    details: {
      findings,
      count: findings.length,
    },
  };
}
