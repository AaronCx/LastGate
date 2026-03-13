import type { ToolResult } from "../types";

export const STATUS_TOOL = {
  name: "lastgate_status",
  description: "Get the current LastGate status for a repository — recent check results, pass rate, and health.",
  inputSchema: {
    type: "object" as const,
    properties: {
      repo: { type: "string", description: "Repository full name (e.g., AaronCx/AgentForge)" },
    },
    required: ["repo"],
  },
};

export function formatStatusResult(
  repo: string,
  recentRuns: { status: string; commit_sha: string; created_at: string }[]
): ToolResult {
  if (recentRuns.length === 0) {
    return { content: [{ type: "text", text: `No recent check runs found for ${repo}.` }] };
  }

  const total = recentRuns.length;
  const passed = recentRuns.filter((r) => r.status === "passed").length;
  const failed = recentRuns.filter((r) => r.status === "failed").length;
  const passRate = Math.round((passed / total) * 100);

  const latest = recentRuns[0];
  const statusEmoji = latest.status === "passed" ? "✅" : latest.status === "failed" ? "❌" : "⚠️";

  let text = `## ${repo} — LastGate Status\n\n`;
  text += `${statusEmoji} Latest: **${latest.status}** (${latest.commit_sha.slice(0, 7)})\n`;
  text += `Pass rate: **${passRate}%** (${passed}/${total} recent checks)\n\n`;

  if (failed > 0) {
    text += `⚠️ ${failed} failed check${failed !== 1 ? "s" : ""} in recent history.\n`;
  }

  return { content: [{ type: "text", text }] };
}
