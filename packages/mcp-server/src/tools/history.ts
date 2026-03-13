import type { ToolResult } from "../types";

export const HISTORY_TOOL = {
  name: "lastgate_history",
  description: "Get the check run history for a repository, with optional limit.",
  inputSchema: {
    type: "object" as const,
    properties: {
      repo: { type: "string", description: "Repository full name (e.g., AaronCx/AgentForge)" },
      limit: { type: "number", description: "Number of recent runs to return (default: 10, max: 50)" },
    },
    required: ["repo"],
  },
};

export interface HistoryRun {
  id: string;
  status: string;
  commit_sha: string;
  commit_message?: string;
  author?: string;
  checks_passed: number;
  checks_failed: number;
  created_at: string;
  duration_ms?: number;
}

export function formatHistoryResult(
  repo: string,
  runs: HistoryRun[]
): ToolResult {
  if (runs.length === 0) {
    return { content: [{ type: "text", text: `No check history found for ${repo}.` }] };
  }

  let text = `## ${repo} — Check History (${runs.length} runs)\n\n`;

  for (const run of runs) {
    const emoji = run.status === "passed" ? "✅" : run.status === "failed" ? "❌" : "⚠️";
    const sha = run.commit_sha.slice(0, 7);
    const date = new Date(run.created_at).toISOString().split("T")[0];
    const duration = run.duration_ms ? ` (${(run.duration_ms / 1000).toFixed(1)}s)` : "";

    text += `${emoji} **${run.status}** \`${sha}\` — ${date}${duration}\n`;
    if (run.commit_message) {
      text += `  ${run.commit_message.split("\n")[0]}\n`;
    }
    text += `  ${run.checks_passed} passed, ${run.checks_failed} failed`;
    if (run.author) {
      text += ` — by ${run.author}`;
    }
    text += "\n\n";
  }

  return { content: [{ type: "text", text }] };
}
