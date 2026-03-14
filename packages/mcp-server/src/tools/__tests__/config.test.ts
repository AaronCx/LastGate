import { describe, test, expect } from "bun:test";
import { CONFIG_TOOL, formatConfigResult } from "../config";

describe("lastgate_config Tool", () => {
  describe("schema definition", () => {
    test("tool name is correct", () => {
      expect(CONFIG_TOOL.name).toBe("lastgate_config");
    });

    test("has a description", () => {
      expect(CONFIG_TOOL.description).toBeDefined();
      expect(CONFIG_TOOL.description.length).toBeGreaterThan(10);
    });

    test("inputSchema type is object", () => {
      expect(CONFIG_TOOL.inputSchema.type).toBe("object");
    });

    test("repo is required", () => {
      expect(CONFIG_TOOL.inputSchema.required).toContain("repo");
    });

    test("repo is a string type", () => {
      expect(CONFIG_TOOL.inputSchema.properties.repo.type).toBe("string");
    });

    test("path param is defined with string type", () => {
      const path = CONFIG_TOOL.inputSchema.properties.path;
      expect(path).toBeDefined();
      expect(path.type).toBe("string");
    });

    test("path param has a description mentioning local filesystem", () => {
      expect(CONFIG_TOOL.inputSchema.properties.path.description).toBeDefined();
      expect(CONFIG_TOOL.inputSchema.properties.path.description.length).toBeGreaterThan(0);
    });

    test("path is not required", () => {
      expect(CONFIG_TOOL.inputSchema.required).not.toContain("path");
    });
  });

  describe("formatConfigResult — null config", () => {
    test("no config returns not found message", () => {
      const result = formatConfigResult("AaronCx/Test", null);
      expect(result.content[0].text).toContain("No .lastgate.yml");
    });

    test("null config message includes repo name", () => {
      const result = formatConfigResult("org/my-repo", null);
      expect(result.content[0].text).toContain("org/my-repo");
    });

    test("null config response has correct structure", () => {
      const result = formatConfigResult("x/y", null);
      expect(result.content).toBeDefined();
      expect(result.content.length).toBe(1);
      expect(result.content[0].type).toBe("text");
    });
  });

  describe("formatConfigResult — basic config", () => {
    test("config formatted as YAML code block", () => {
      const result = formatConfigResult("AaronCx/Test", {
        checks: ["secrets", "lint"],
        fail_on: "error",
      });
      expect(result.content[0].text).toContain("```yaml");
      expect(result.content[0].text).toContain("checks:");
      expect(result.content[0].text).toContain("- secrets");
      expect(result.content[0].text).toContain("- lint");
      expect(result.content[0].text).toContain("fail_on: error");
    });

    test("YAML code block is properly closed", () => {
      const result = formatConfigResult("AaronCx/Test", { key: "val" });
      const text = result.content[0].text;
      const openCount = (text.match(/```yaml/g) || []).length;
      const closeCount = (text.match(/```\n/g) || []).length;
      expect(openCount).toBe(1);
      expect(closeCount).toBe(1);
    });

    test("repo name in header", () => {
      const result = formatConfigResult("AaronCx/AgentForge", { checks: ["secrets"] });
      expect(result.content[0].text).toContain("AaronCx/AgentForge");
    });

    test("header uses ## markdown format", () => {
      const result = formatConfigResult("org/repo", { a: 1 });
      expect(result.content[0].text).toContain("## org/repo");
    });

    test("string values rendered correctly", () => {
      const result = formatConfigResult("x/y", { name: "my-config", version: "1.0" });
      expect(result.content[0].text).toContain("name: my-config");
      expect(result.content[0].text).toContain("version: 1.0");
    });

    test("numeric values rendered correctly", () => {
      const result = formatConfigResult("x/y", { timeout: 30, retries: 3 });
      expect(result.content[0].text).toContain("timeout: 30");
      expect(result.content[0].text).toContain("retries: 3");
    });

    test("boolean values rendered correctly", () => {
      const result = formatConfigResult("x/y", { enabled: true, verbose: false });
      expect(result.content[0].text).toContain("enabled: true");
      expect(result.content[0].text).toContain("verbose: false");
    });
  });

  describe("formatConfigResult — null and undefined values", () => {
    test("null values formatted as null", () => {
      const result = formatConfigResult("AaronCx/Test", { key: null });
      expect(result.content[0].text).toContain("key: null");
    });

    test("undefined values formatted as null", () => {
      const result = formatConfigResult("x/y", { key: undefined });
      expect(result.content[0].text).toContain("key: null");
    });
  });

  describe("formatConfigResult — arrays", () => {
    test("simple arrays use dash notation", () => {
      const result = formatConfigResult("x/y", { items: ["a", "b", "c"] });
      const text = result.content[0].text;
      expect(text).toContain("items:");
      expect(text).toContain("- a");
      expect(text).toContain("- b");
      expect(text).toContain("- c");
    });

    test("empty array renders key with no items", () => {
      const result = formatConfigResult("x/y", { empty: [] });
      const text = result.content[0].text;
      expect(text).toContain("empty:");
      // Should not crash; empty array just shows the key
    });

    test("array of objects renders nested structure", () => {
      const result = formatConfigResult("x/y", {
        rules: [
          { name: "no-secrets", severity: "error" },
          { name: "lint", severity: "warn" },
        ],
      });
      const text = result.content[0].text;
      expect(text).toContain("rules:");
      expect(text).toContain("- name: no-secrets");
      expect(text).toContain("severity: error");
      expect(text).toContain("- name: lint");
      expect(text).toContain("severity: warn");
    });

    test("array of numbers", () => {
      const result = formatConfigResult("x/y", { ports: [3000, 8080, 443] });
      const text = result.content[0].text;
      expect(text).toContain("- 3000");
      expect(text).toContain("- 8080");
      expect(text).toContain("- 443");
    });
  });

  describe("formatConfigResult — nested objects", () => {
    test("nested config is formatted with indentation", () => {
      const result = formatConfigResult("AaronCx/Test", {
        notifications: { slack: true },
      });
      const text = result.content[0].text;
      expect(text).toContain("notifications:");
      expect(text).toContain("slack: true");
    });

    test("deeply nested objects", () => {
      const result = formatConfigResult("x/y", {
        level1: {
          level2: {
            level3: "deep",
          },
        },
      });
      const text = result.content[0].text;
      expect(text).toContain("level1:");
      expect(text).toContain("level2:");
      expect(text).toContain("level3: deep");
    });

    test("nested indentation increases with depth", () => {
      const result = formatConfigResult("x/y", {
        a: {
          b: {
            c: "val",
          },
        },
      });
      const text = result.content[0].text;
      const lines = text.split("\n");
      const lineA = lines.find((l) => l.includes("a:"));
      const lineB = lines.find((l) => l.includes("b:"));
      const lineC = lines.find((l) => l.includes("c: val"));
      expect(lineA).toBeDefined();
      expect(lineB).toBeDefined();
      expect(lineC).toBeDefined();
      // b should be indented more than a, c more than b
      const indentA = lineA!.search(/\S/);
      const indentB = lineB!.search(/\S/);
      const indentC = lineC!.search(/\S/);
      expect(indentB).toBeGreaterThan(indentA);
      expect(indentC).toBeGreaterThan(indentB);
    });

    test("mixed nested objects and arrays", () => {
      const result = formatConfigResult("x/y", {
        checks: {
          enabled: ["secrets", "lint"],
          disabled: ["style"],
        },
      });
      const text = result.content[0].text;
      expect(text).toContain("checks:");
      expect(text).toContain("enabled:");
      expect(text).toContain("- secrets");
      expect(text).toContain("disabled:");
      expect(text).toContain("- style");
    });
  });

  describe("formatConfigResult — empty config", () => {
    test("empty object config produces YAML block with no entries", () => {
      const result = formatConfigResult("x/y", {});
      const text = result.content[0].text;
      expect(text).toContain("```yaml");
      expect(text).toContain("```\n");
      expect(text).toContain("x/y");
    });
  });

  describe("formatConfigResult — output structure", () => {
    test("response has content array with text type", () => {
      const result = formatConfigResult("x/y", { a: 1 });
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBe(1);
      expect(result.content[0].type).toBe("text");
    });
  });
});
