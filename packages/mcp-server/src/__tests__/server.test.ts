import { describe, test, expect } from "bun:test";
import { createServer } from "../server";
import { PRE_CHECK_TOOL } from "../tools/pre-check";
import { STATUS_TOOL } from "../tools/status";
import { CONFIG_TOOL } from "../tools/config";
import { HISTORY_TOOL } from "../tools/history";

describe("MCP Server Startup", () => {
  test("server creates without errors", () => {
    const server = createServer();
    expect(server).toBeDefined();
  });

  test("server registers all 4 tools", () => {
    const tools = [PRE_CHECK_TOOL, STATUS_TOOL, CONFIG_TOOL, HISTORY_TOOL];
    expect(tools.length).toBe(4);
    expect(tools.map((t) => t.name)).toContain("lastgate_pre_check");
    expect(tools.map((t) => t.name)).toContain("lastgate_status");
    expect(tools.map((t) => t.name)).toContain("lastgate_config");
    expect(tools.map((t) => t.name)).toContain("lastgate_history");
  });

  test("all tools have input schemas", () => {
    for (const tool of [PRE_CHECK_TOOL, STATUS_TOOL, CONFIG_TOOL, HISTORY_TOOL]) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  test("all tools have descriptions", () => {
    for (const tool of [PRE_CHECK_TOOL, STATUS_TOOL, CONFIG_TOOL, HISTORY_TOOL]) {
      expect(tool.description).toBeDefined();
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });
});
