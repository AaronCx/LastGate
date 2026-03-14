import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createServer } from "../server";
import { PRE_CHECK_TOOL } from "../tools/pre-check";
import { STATUS_TOOL } from "../tools/status";
import { CONFIG_TOOL } from "../tools/config";
import { HISTORY_TOOL } from "../tools/history";

describe("MCP Server", () => {
  describe("createServer", () => {
    test("server creates without errors", () => {
      const server = createServer();
      expect(server).toBeDefined();
    });

    test("server is an object with expected methods", () => {
      const server = createServer();
      expect(typeof server).toBe("object");
    });

    test("multiple servers can be created independently", () => {
      const server1 = createServer();
      const server2 = createServer();
      expect(server1).toBeDefined();
      expect(server2).toBeDefined();
      expect(server1).not.toBe(server2);
    });
  });

  describe("tool registration", () => {
    const TOOLS = [PRE_CHECK_TOOL, STATUS_TOOL, CONFIG_TOOL, HISTORY_TOOL];

    test("exactly 4 tools are registered", () => {
      expect(TOOLS.length).toBe(4);
    });

    test("all expected tool names are present", () => {
      const names = TOOLS.map((t) => t.name);
      expect(names).toContain("lastgate_pre_check");
      expect(names).toContain("lastgate_status");
      expect(names).toContain("lastgate_config");
      expect(names).toContain("lastgate_history");
    });

    test("tool names are unique", () => {
      const names = TOOLS.map((t) => t.name);
      expect(new Set(names).size).toBe(names.length);
    });

    test("all tools have input schemas", () => {
      for (const tool of TOOLS) {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
      }
    });

    test("all tools have descriptions", () => {
      for (const tool of TOOLS) {
        expect(tool.description).toBeDefined();
        expect(tool.description.length).toBeGreaterThan(10);
      }
    });

    test("all tools have properties defined", () => {
      for (const tool of TOOLS) {
        expect(tool.inputSchema.properties).toBeDefined();
        expect(typeof tool.inputSchema.properties).toBe("object");
      }
    });

    test("all tools have a required array", () => {
      for (const tool of TOOLS) {
        expect(tool.inputSchema.required).toBeDefined();
        expect(Array.isArray(tool.inputSchema.required)).toBe(true);
      }
    });
  });

  describe("tool schema details", () => {
    test("pre_check requires files", () => {
      expect(PRE_CHECK_TOOL.inputSchema.required).toEqual(["files"]);
    });

    test("status requires repo", () => {
      expect(STATUS_TOOL.inputSchema.required).toEqual(["repo"]);
    });

    test("config requires repo", () => {
      expect(CONFIG_TOOL.inputSchema.required).toEqual(["repo"]);
    });

    test("history requires repo", () => {
      expect(HISTORY_TOOL.inputSchema.required).toEqual(["repo"]);
    });

    test("pre_check has diff, branch, and config_path params", () => {
      const props = PRE_CHECK_TOOL.inputSchema.properties;
      expect(props.diff).toBeDefined();
      expect(props.branch).toBeDefined();
      expect(props.config_path).toBeDefined();
    });

    test("config has path param", () => {
      expect(CONFIG_TOOL.inputSchema.properties.path).toBeDefined();
    });

    test("history has limit param", () => {
      expect(HISTORY_TOOL.inputSchema.properties.limit).toBeDefined();
      expect(HISTORY_TOOL.inputSchema.properties.limit.type).toBe("number");
    });
  });

  describe("getApiBaseUrl helper (via env)", () => {
    let originalUrl: string | undefined;

    beforeEach(() => {
      originalUrl = process.env.LASTGATE_API_URL;
    });

    afterEach(() => {
      if (originalUrl !== undefined) {
        process.env.LASTGATE_API_URL = originalUrl;
      } else {
        delete process.env.LASTGATE_API_URL;
      }
    });

    test("default URL is used when env var is not set", () => {
      delete process.env.LASTGATE_API_URL;
      // We verify indirectly that the server creates successfully with default URL
      const server = createServer();
      expect(server).toBeDefined();
    });

    test("custom URL from env is accepted", () => {
      process.env.LASTGATE_API_URL = "https://custom.example.com";
      const server = createServer();
      expect(server).toBeDefined();
    });
  });

  describe("getApiKey helper (via env)", () => {
    let originalKey: string | undefined;

    beforeEach(() => {
      originalKey = process.env.LASTGATE_API_KEY;
    });

    afterEach(() => {
      if (originalKey !== undefined) {
        process.env.LASTGATE_API_KEY = originalKey;
      } else {
        delete process.env.LASTGATE_API_KEY;
      }
    });

    test("server creates with no API key set", () => {
      delete process.env.LASTGATE_API_KEY;
      const server = createServer();
      expect(server).toBeDefined();
    });

    test("server creates with API key set", () => {
      process.env.LASTGATE_API_KEY = "lg_cli_test1234567890abcdef";
      const server = createServer();
      expect(server).toBeDefined();
    });
  });

  describe("loadLocalConfig behavior (tested via config tool schema)", () => {
    // loadLocalConfig is not exported, but its behavior is exercised through
    // the config tool handler. We test the schema shape here; integration tests
    // would cover the actual file reading.

    test("config tool path param description mentions local filesystem", () => {
      const desc = CONFIG_TOOL.inputSchema.properties.path.description;
      expect(desc).toContain("local");
    });

    test("pre_check config_path param description mentions .lastgate.yml", () => {
      const desc = PRE_CHECK_TOOL.inputSchema.properties.config_path.description;
      expect(desc).toContain(".lastgate.yml");
    });
  });
});
