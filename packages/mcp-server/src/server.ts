import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { validateApiKey } from "./auth";
import { PRE_CHECK_TOOL, formatPreCheckResult } from "./tools/pre-check";
import { STATUS_TOOL, formatStatusResult } from "./tools/status";
import { CONFIG_TOOL, formatConfigResult } from "./tools/config";
import { HISTORY_TOOL, formatHistoryResult } from "./tools/history";

const TOOLS = [PRE_CHECK_TOOL, STATUS_TOOL, CONFIG_TOOL, HISTORY_TOOL];

export function createServer() {
  const server = new Server(
    { name: "lastgate-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Validate API key from environment
    const apiKeyResult = validateApiKey(process.env.LASTGATE_API_KEY);
    if (!apiKeyResult.valid) {
      return {
        content: [{ type: "text", text: `Authentication error: ${apiKeyResult.error}` }],
        isError: true,
      };
    }

    switch (name) {
      case "lastgate_pre_check": {
        // In a real implementation, this would call the LastGate engine
        // For now, return a formatted placeholder
        const checks = args?.files
          ? [{ type: "placeholder", status: "pass", title: "Pre-check received files" }]
          : [];
        return formatPreCheckResult(checks);
      }

      case "lastgate_status": {
        const repo = args?.repo as string;
        if (!repo) {
          return { content: [{ type: "text", text: "Error: repo parameter is required" }], isError: true };
        }
        // In a real implementation, this would query Supabase
        return formatStatusResult(repo, []);
      }

      case "lastgate_config": {
        const repo = args?.repo as string;
        if (!repo) {
          return { content: [{ type: "text", text: "Error: repo parameter is required" }], isError: true };
        }
        // In a real implementation, this would fetch the config from the repo
        return formatConfigResult(repo, null);
      }

      case "lastgate_history": {
        const repo = args?.repo as string;
        if (!repo) {
          return { content: [{ type: "text", text: "Error: repo parameter is required" }], isError: true };
        }
        // In a real implementation, this would query Supabase
        return formatHistoryResult(repo, []);
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  });

  return server;
}

export async function startServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
