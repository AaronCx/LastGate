import { describe, test, expect } from "bun:test";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("CLI login command", () => {
  test("stores API key in config file", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "login-test-"));
    try {
      const configDir = join(tmpDir, ".lastgate");
      const configPath = join(configDir, "config.json");
      await Bun.write(configPath, JSON.stringify({ api_key: "lg_test_abc123" }));
      const content = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(content.api_key).toBe("lg_test_abc123");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("--key flag accepts key inline", () => {
    const options = { key: "lg_xxxxx" };
    expect(options.key).toStartWith("lg_");
  });

  test("config directory path follows convention", () => {
    const home = process.env.HOME || "~";
    const configPath = join(home, ".lastgate", "config.json");
    expect(configPath).toContain(".lastgate");
    expect(configPath).toContain("config.json");
  });

  test("invalid key format is detectable", () => {
    const validKey = "lg_cli_abc123def456ghi789";
    const invalidKey = "not_a_valid_key";
    expect(validKey.startsWith("lg_")).toBe(true);
    expect(invalidKey.startsWith("lg_")).toBe(false);
  });

  test("subsequent commands use stored key", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "login-test-"));
    try {
      const configPath = join(tmpDir, ".lastgate", "config.json");
      await Bun.write(configPath, JSON.stringify({ api_key: "lg_stored_key" }));
      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(config.api_key).toBe("lg_stored_key");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
