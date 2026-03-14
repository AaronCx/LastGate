import type { ToolResult } from "../types";

export const CONFIG_TOOL = {
  name: "lastgate_config",
  description: "Get the LastGate configuration (.lastgate.yml) for a repository.",
  inputSchema: {
    type: "object" as const,
    properties: {
      repo: { type: "string", description: "Repository full name (e.g., AaronCx/AgentForge)" },
      path: { type: "string", description: "Absolute path to the repo root on the local filesystem (used to read .lastgate.yml)" },
    },
    required: ["repo"],
  },
};

export function formatConfigResult(
  repo: string,
  config: Record<string, unknown> | null
): ToolResult {
  if (!config) {
    return {
      content: [{ type: "text", text: `No .lastgate.yml found for ${repo}.` }],
    };
  }

  let text = `## ${repo} — LastGate Configuration\n\n`;
  text += "```yaml\n";
  text += formatYaml(config);
  text += "```\n";

  return { content: [{ type: "text", text }] };
}

function formatYaml(obj: Record<string, unknown>, indent = 0): string {
  let result = "";
  const prefix = "  ".repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      result += `${prefix}${key}: null\n`;
    } else if (Array.isArray(value)) {
      result += `${prefix}${key}:\n`;
      for (const item of value) {
        if (typeof item === "object" && item !== null) {
          result += `${prefix}  - ${formatYaml(item as Record<string, unknown>, indent + 2).trimStart()}`;
        } else {
          result += `${prefix}  - ${item}\n`;
        }
      }
    } else if (typeof value === "object") {
      result += `${prefix}${key}:\n`;
      result += formatYaml(value as Record<string, unknown>, indent + 1);
    } else {
      result += `${prefix}${key}: ${value}\n`;
    }
  }

  return result;
}
