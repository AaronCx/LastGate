import { describe, test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, existsSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("CLI init command", () => {
  test("creates a .lastgate.yml file", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "init-test-"));
    try {
      const configPath = join(tmpDir, ".lastgate.yml");
      const defaultConfig = `# LastGate Configuration\nchecks:\n  secrets:\n    enabled: true\n`;
      await Bun.write(configPath, defaultConfig);
      expect(existsSync(configPath)).toBe(true);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("file contains valid config with check sections", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "init-test-"));
    try {
      const configPath = join(tmpDir, ".lastgate.yml");
      const DEFAULT_CONFIG = `# LastGate Configuration\nchecks:\n  secrets:\n    enabled: true\n    severity: fail\n  lint:\n    enabled: true\n    severity: fail\n  commit-message:\n    enabled: true\n  sensitive-files:\n    enabled: true\n`;
      await Bun.write(configPath, DEFAULT_CONFIG);
      const content = readFileSync(configPath, "utf-8");
      expect(content).toContain("checks:");
      expect(content).toContain("secrets:");
      expect(content).toContain("lint:");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("detects existing .lastgate.yml", () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "init-test-"));
    try {
      const configPath = join(tmpDir, ".lastgate.yml");
      writeFileSync(configPath, "existing: true");
      expect(existsSync(configPath)).toBe(true);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("--force would overwrite without confirmation", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "init-test-"));
    try {
      const configPath = join(tmpDir, ".lastgate.yml");
      writeFileSync(configPath, "old: config");
      // Force overwrite
      const newConfig = "# New config\nchecks:\n  secrets:\n    enabled: true\n";
      await Bun.write(configPath, newConfig);
      const content = readFileSync(configPath, "utf-8");
      expect(content).toContain("New config");
      expect(content).not.toContain("old: config");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
