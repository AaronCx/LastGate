import type { PreCheckInput, ToolResult } from "../types";

export const PRE_CHECK_TOOL = {
  name: "lastgate_pre_check",
  description: "Run LastGate checks against proposed changes BEFORE committing. Returns which checks would pass or fail.",
  inputSchema: {
    type: "object" as const,
    properties: {
      files: {
        type: "array",
        description: "Array of files being changed",
        items: {
          type: "object",
          properties: {
            path: { type: "string" },
            content: { type: "string" },
            status: { type: "string", enum: ["added", "modified", "deleted"] },
          },
        },
      },
      diff: { type: "string", description: "Unified diff of the proposed changes (optional, used as patch data)" },
      commit_message: { type: "string", description: "Proposed commit message" },
      repo: { type: "string", description: "Repository full name (e.g., AaronCx/AgentForge)" },
      branch: { type: "string", description: "Current branch name (default: main)" },
      config_path: { type: "string", description: "Absolute path to .lastgate.yml (optional, used to load pipeline config)" },
    },
    required: ["files"],
  },
};

export function formatPreCheckResult(
  checks: { type: string; status: string; title: string; details?: { findings?: any[] } }[]
): ToolResult {
  const failures = checks.filter((c) => c.status === "fail");
  const warnings = checks.filter((c) => c.status === "warn");

  let response = "";

  if (failures.length === 0 && warnings.length === 0) {
    response = "All LastGate checks passed. Safe to commit.";
  } else {
    if (failures.length > 0) {
      response += `${failures.length} check(s) would FAIL:\n\n`;
      for (const f of failures) {
        response += `### ${f.type.toUpperCase()}\n`;
        response += `${f.title}\n`;
        for (const finding of f.details?.findings || []) {
          response += `- ${finding.file}${finding.line ? `:${finding.line}` : ""} — ${finding.message}\n`;
        }
        response += "\n";
      }
    }
    if (warnings.length > 0) {
      response += `${warnings.length} warning(s):\n\n`;
      for (const w of warnings) {
        response += `- **${w.type}**: ${w.title}\n`;
      }
    }
    response += "\nFix these issues before committing.";
  }

  return { content: [{ type: "text", text: response }] };
}
