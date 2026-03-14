import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { runCheckPipeline, parseConfig } from "@lastgate/engine";
import { validateApiKey } from "./auth";
import { PRE_CHECK_TOOL, formatPreCheckResult } from "./tools/pre-check";
import { STATUS_TOOL, formatStatusResult } from "./tools/status";
import { CONFIG_TOOL, formatConfigResult } from "./tools/config";
import { HISTORY_TOOL, formatHistoryResult } from "./tools/history";
import type { ChangedFile, CommitInfo } from "@lastgate/engine";

const TOOLS = [PRE_CHECK_TOOL, STATUS_TOOL, CONFIG_TOOL, HISTORY_TOOL];

function getApiBaseUrl(): string {
  return process.env.LASTGATE_API_URL || "https://lastgate.vercel.app";
}

function getApiKey(): string {
  return process.env.LASTGATE_API_KEY || "";
}

async function apiFetch(path: string, params?: Record<string, string>) {
  const baseUrl = getApiBaseUrl();
  const url = new URL(path, baseUrl);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API request failed (${response.status}): ${body}`);
  }

  return response.json();
}

function loadLocalConfig(configPath: string): Record<string, unknown> | null {
  try {
    if (!existsSync(configPath)) {
      return null;
    }
    const raw = readFileSync(configPath, "utf-8");
    return parseConfig(raw) as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
}

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
        const files = (args?.files as Array<{ path: string; content: string; status: string }>) || [];
        if (files.length === 0) {
          return { content: [{ type: "text", text: "Error: files array is required and must not be empty" }], isError: true };
        }

        const commitMessage = (args?.commit_message as string) || "";
        const repo = (args?.repo as string) || "local/repo";
        const branch = (args?.branch as string) || "main";
        const diff = (args?.diff as string) || undefined;
        const configPath = args?.config_path as string | undefined;

        // Map input files to the engine's ChangedFile format
        const changedFiles: ChangedFile[] = files.map((f) => ({
          path: f.path,
          content: f.content || "",
          patch: diff,
          status: (f.status === "deleted" ? "removed" : f.status) as ChangedFile["status"],
        }));

        // Build a synthetic commit from the proposed commit message
        const commits: CommitInfo[] = commitMessage
          ? [{ sha: "0000000", message: commitMessage, author: "local", timestamp: new Date().toISOString() }]
          : [];

        // Load pipeline config from local .lastgate.yml if a path was provided
        let pipelineConfig: Record<string, unknown> | undefined;
        if (configPath) {
          const loaded = loadLocalConfig(configPath);
          if (loaded) {
            pipelineConfig = loaded as Record<string, unknown>;
          }
        }

        try {
          const results = await runCheckPipeline({
            files: changedFiles,
            commits,
            branch,
            repoFullName: repo,
            config: pipelineConfig as any,
          });

          return formatPreCheckResult(results.checks);
        } catch (error) {
          return {
            content: [{ type: "text", text: `Engine error: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
          };
        }
      }

      case "lastgate_status": {
        const repo = args?.repo as string;
        if (!repo) {
          return { content: [{ type: "text", text: "Error: repo parameter is required" }], isError: true };
        }

        try {
          const result = await apiFetch("/api/checks", { repo, limit: "10" });
          const runs = (result.data || []).map((r: any) => ({
            status: r.conclusion || r.status || "unknown",
            commit_sha: r.commit_sha || r.head_sha || "",
            created_at: r.created_at || "",
          }));
          return formatStatusResult(repo, runs);
        } catch (error) {
          return {
            content: [{ type: "text", text: `Failed to fetch status for ${repo}: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
          };
        }
      }

      case "lastgate_config": {
        const repo = args?.repo as string;
        if (!repo) {
          return { content: [{ type: "text", text: "Error: repo parameter is required" }], isError: true };
        }

        const repoPath = args?.path as string | undefined;
        const configFilePath = repoPath
          ? join(repoPath, ".lastgate.yml")
          : ".lastgate.yml";

        const config = loadLocalConfig(configFilePath);
        return formatConfigResult(repo, config);
      }

      case "lastgate_history": {
        const repo = args?.repo as string;
        if (!repo) {
          return { content: [{ type: "text", text: "Error: repo parameter is required" }], isError: true };
        }

        const limit = Math.min(Math.max((args?.limit as number) || 10, 1), 50);

        try {
          const result = await apiFetch("/api/checks", { repo, limit: String(limit) });
          const runs = (result.data || []).map((r: any) => ({
            id: r.id || "",
            status: r.conclusion || r.status || "unknown",
            commit_sha: r.commit_sha || r.head_sha || "",
            commit_message: r.commit_message || "",
            author: r.author || r.sender_login || "",
            checks_passed: r.checks_passed ?? 0,
            checks_failed: r.checks_failed ?? 0,
            created_at: r.created_at || "",
            duration_ms: r.duration_ms,
          }));
          return formatHistoryResult(repo, runs);
        } catch (error) {
          return {
            content: [{ type: "text", text: `Failed to fetch history for ${repo}: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
          };
        }
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
