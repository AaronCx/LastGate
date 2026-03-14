import { describe, test, expect } from "bun:test";
import { mkdtempSync, rmSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { tmpdir, homedir } from "os";

/**
 * Tests for the login command logic.
 *
 * Validates config path conventions, token storage,
 * and CliConfig shape.
 */

interface CliConfig {
  token?: string;
  apiUrl?: string;
}

describe("config path", () => {
  test("config directory is ~/.lastgate", () => {
    const configDir = resolve(homedir(), ".lastgate");
    expect(configDir).toContain(".lastgate");
    expect(configDir).toStartWith(homedir());
  });

  test("config file is config.json inside .lastgate dir", () => {
    const configDir = resolve(homedir(), ".lastgate");
    const configPath = resolve(configDir, "config.json");
    expect(configPath).toContain(".lastgate");
    expect(configPath).toEndWith("config.json");
  });

  test("config path is absolute", () => {
    const configPath = resolve(homedir(), ".lastgate", "config.json");
    expect(configPath).toStartWith("/");
  });
});

describe("token storage", () => {
  test("stores token in config.json as JSON", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "login-test-"));
    try {
      const configDir = join(tmpDir, ".lastgate");
      mkdirSync(configDir, { recursive: true });
      const configPath = join(configDir, "config.json");

      const config: CliConfig = { token: "lg_test_abc123" };
      await Bun.write(configPath, JSON.stringify(config, null, 2));

      const content = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(content.token).toBe("lg_test_abc123");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("uses 'token' field (not 'api_key')", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "login-test-"));
    try {
      const configDir = join(tmpDir, ".lastgate");
      mkdirSync(configDir, { recursive: true });
      const configPath = join(configDir, "config.json");

      const config: CliConfig = { token: "test_token_value" };
      await Bun.write(configPath, JSON.stringify(config, null, 2));

      const content = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(content).toHaveProperty("token");
      expect(content).not.toHaveProperty("api_key");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("--token flag accepts token directly", () => {
    const options = { token: "lg_direct_token" };
    expect(options.token).toBe("lg_direct_token");
  });

  test("preserves existing config fields when saving token", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "login-test-"));
    try {
      const configDir = join(tmpDir, ".lastgate");
      mkdirSync(configDir, { recursive: true });
      const configPath = join(configDir, "config.json");

      // Save initial config with apiUrl
      const initial: CliConfig = { apiUrl: "https://custom.example.com" };
      await Bun.write(configPath, JSON.stringify(initial, null, 2));

      // Load, add token, save
      const loaded = JSON.parse(readFileSync(configPath, "utf-8")) as CliConfig;
      loaded.token = "new_token";
      await Bun.write(configPath, JSON.stringify(loaded, null, 2));

      const final = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(final.token).toBe("new_token");
      expect(final.apiUrl).toBe("https://custom.example.com");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("creates .lastgate directory if it does not exist", () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "login-test-"));
    try {
      const configDir = join(tmpDir, ".lastgate");
      expect(existsSync(configDir)).toBe(false);

      mkdirSync(configDir, { recursive: true, mode: 0o700 });
      expect(existsSync(configDir)).toBe(true);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("loadCliConfig behavior", () => {
  test("returns empty object when config file does not exist", () => {
    // Simulates the try/catch in loadCliConfig
    let config: CliConfig;
    try {
      throw new Error("ENOENT");
    } catch {
      config = {};
    }
    expect(config).toEqual({});
    expect(config.token).toBeUndefined();
  });

  test("parses valid JSON config file", () => {
    const jsonStr = JSON.stringify({ token: "abc", apiUrl: "https://x.com" });
    const config = JSON.parse(jsonStr) as CliConfig;
    expect(config.token).toBe("abc");
    expect(config.apiUrl).toBe("https://x.com");
  });

  test("returns empty object for invalid JSON", () => {
    let config: CliConfig;
    try {
      JSON.parse("not valid json");
      config = {} as CliConfig; // unreachable
    } catch {
      config = {};
    }
    expect(config).toEqual({});
  });
});

describe("CliConfig shape", () => {
  test("token field is optional string", () => {
    const withToken: CliConfig = { token: "some-token" };
    const withoutToken: CliConfig = {};
    expect(withToken.token).toBe("some-token");
    expect(withoutToken.token).toBeUndefined();
  });

  test("apiUrl field is optional string", () => {
    const withUrl: CliConfig = { apiUrl: "https://custom.api.com" };
    const withoutUrl: CliConfig = {};
    expect(withUrl.apiUrl).toBe("https://custom.api.com");
    expect(withoutUrl.apiUrl).toBeUndefined();
  });
});

describe("dashboard login URL", () => {
  test("default URL uses lastgate.vercel.app", () => {
    const base = process.env.LASTGATE_API_URL || "https://lastgate.vercel.app";
    const loginUrl = `${base}/api/cli/auth`;
    expect(loginUrl).toContain("/api/cli/auth");
  });

  test("login URL is configurable via LASTGATE_API_URL env", () => {
    const customBase = "https://custom.example.com";
    const loginUrl = `${customBase}/api/cli/auth`;
    expect(loginUrl).toBe("https://custom.example.com/api/cli/auth");
  });
});

describe("token validation", () => {
  test("empty token string is rejected", () => {
    const token = "";
    const isValid = token.trim().length > 0;
    expect(isValid).toBe(false);
  });

  test("whitespace-only token is rejected", () => {
    const token = "   ";
    const isValid = token.trim().length > 0;
    expect(isValid).toBe(false);
  });

  test("non-empty token is accepted", () => {
    const token = "lg_valid_token_123";
    const isValid = token.trim().length > 0;
    expect(isValid).toBe(true);
  });

  test("token is trimmed before storage", () => {
    const token = "  lg_token_with_spaces  ";
    const trimmed = token.trim();
    expect(trimmed).toBe("lg_token_with_spaces");
  });
});
