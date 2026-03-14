import { describe, test, expect } from "bun:test";
import { validateApiKey } from "../auth";

describe("MCP Auth", () => {
  test("valid lg_ key is accepted", () => {
    const result = validateApiKey("lg_abcdefghijklmnopqrstuvwxyz");
    expect(result.valid).toBe(true);
  });

  test("valid lg_cli_ key is accepted", () => {
    const result = validateApiKey("lg_cli_abcdefghijklmnopqrstuvwxyz");
    expect(result.valid).toBe(true);
  });

  test("missing API key is rejected", () => {
    const result = validateApiKey(undefined);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("required");
  });

  test("invalid prefix is rejected", () => {
    const prefix = "sk_" + "live_";
    const result = validateApiKey(`${prefix}abcdefghijklmnopqrstuvwxyz`);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("format");
  });

  test("short key is rejected", () => {
    const result = validateApiKey("lg_cli_short");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("short");
  });

  test("empty string is rejected", () => {
    const result = validateApiKey("");
    expect(result.valid).toBe(false);
  });
});
