import type { Octokit } from "octokit";
import type { CheckRunResults } from "@lastgate/engine";

function buildCompactFindingsSummary(results: CheckRunResults): string {
  const lines: string[] = [];

  for (const check of results.checks) {
    if (check.status !== "fail") continue;
    const findings = (check.details as Record<string, unknown>)?.findings as Array<Record<string, unknown>> | undefined;
    if (findings && findings.length > 0) {
      for (const f of findings) {
        const location = f.line ? `${f.file}:${f.line}` : f.file || '';
        const msg = f.message || f.issue || f.pattern || '';
        lines.push(`- \`${location}\`: ${msg}`);
      }
    } else {
      lines.push(`- ${check.title}: ${check.summary || ''}`);
    }
  }

  return lines.join('\n');
}

export async function postCommitComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  commitSha: string,
  body: string
) {
  try {
    await octokit.request(
      "POST /repos/{owner}/{repo}/commits/{commit_sha}/comments",
      {
        owner,
        repo,
        commit_sha: commitSha,
        body,
      }
    );
  } catch (err) {
    console.error("Failed to post commit comment:", err);
  }
}

export function buildDirectPushWarning(branch: string, results: CheckRunResults): string {
  return `\u26a0\ufe0f **LastGate: This direct push to \`${branch}\` has check failures.**\n\n` +
    `Branch protection should require PRs for this branch. ` +
    `Consider reverting this commit and opening a PR instead.\n\n` +
    buildCompactFindingsSummary(results);
}
