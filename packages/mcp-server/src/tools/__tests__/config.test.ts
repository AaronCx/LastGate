import { describe, test, expect } from "bun:test";
import { CONFIG_TOOL, formatConfigResult } from "../config";

describe("lastgate_config Tool", () => {
  test("tool requires repo", () => {
    expect(CONFIG_TOOL.inputSchema.required).toContain("repo");
  });

  test("no config returns not found message", () => {
    const result = formatConfigResult("AaronCx/Test", null);
    expect(result.content[0].text).toContain("No .lastgate.yml");
  });

  test("config formatted as YAML code block", () => {
    const result = formatConfigResult("AaronCx/Test", {
      checks: ["secrets", "lint"],
      fail_on: "error",
    });
    expect(result.content[0].text).toContain("```yaml");
    expect(result.content[0].text).toContain("checks:");
    expect(result.content[0].text).toContain("- secrets");
    expect(result.content[0].text).toContain("fail_on: error");
  });

  test("nested config is formatted", () => {
    const result = formatConfigResult("AaronCx/Test", {
      notifications: { slack: true },
    });
    expect(result.content[0].text).toContain("notifications:");
    expect(result.content[0].text).toContain("slack: true");
  });

  test("repo name in header", () => {
    const result = formatConfigResult("AaronCx/AgentForge", { checks: ["secrets"] });
    expect(result.content[0].text).toContain("AaronCx/AgentForge");
  });

  test("null values formatted correctly", () => {
    const result = formatConfigResult("AaronCx/Test", { key: null });
    expect(result.content[0].text).toContain("key: null");
  });
});
