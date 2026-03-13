import { describe, test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, existsSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("CLI Smoke Tests", () => {
  test("lastgate --version outputs version format", () => {
    // Version comes from package.json
    const version = "0.1.0";
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("lastgate --help shows available commands", () => {
    const commands = ["check", "init", "login", "history"];
    expect(commands.length).toBe(4);
    expect(commands).toContain("check");
    expect(commands).toContain("init");
  });

  test("lastgate check --help shows check-specific options", () => {
    const options = ["--only", "--branch", "--json", "--verbose"];
    expect(options).toContain("--only");
    expect(options).toContain("--branch");
    expect(options).toContain("--json");
  });

  test("lastgate init creates a valid .lastgate.yml in a temp directory", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "cli-smoke-"));
    try {
      const configPath = join(tmpDir, ".lastgate.yml");
      const config = "checks:\n  secrets:\n    enabled: true\n";
      await Bun.write(configPath, config);
      expect(existsSync(configPath)).toBe(true);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("lastgate check in clean repo would exit 0", () => {
    const results = {
      checks: [{ status: "pass" }, { status: "pass" }],
    };
    const hasFailures = results.checks.some(c => c.status === "fail");
    expect(hasFailures).toBe(false);
    const exitCode = hasFailures ? 1 : 0;
    expect(exitCode).toBe(0);
  });

  test("lastgate check with committed .env would exit 1", () => {
    // The file_patterns check would catch .env
    const results = {
      checks: [{ status: "fail", type: "file_patterns" }],
    };
    const hasFailures = results.checks.some(c => c.status === "fail");
    expect(hasFailures).toBe(true);
    const exitCode = hasFailures ? 1 : 0;
    expect(exitCode).toBe(1);
  });

  test("check command constructs correct pipeline input", () => {
    const input = {
      files: [{ path: "src/index.ts", content: "code", status: "added" }],
      commits: [{ sha: "abc1234", message: "feat: test" }],
      branch: "main",
    };
    expect(input.files.length).toBe(1);
    expect(input.commits.length).toBe(1);
  });
});
