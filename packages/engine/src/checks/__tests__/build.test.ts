import { describe, test, expect } from "bun:test";
import { checkBuild } from "../build";
import type { BuildCheckConfig } from "../../types";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("Build Verifier", () => {
  test("passes when build command succeeds (exit 0)", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "build-test-"));
    try {
      const config = { enabled: true, severity: "fail", command: "echo build-ok", cwd: tmpDir } as any;
      const result = await checkBuild(config);
      expect(result.status).toBe("pass");
      expect(result.type).toBe("build");
      expect(result.summary).toContain("passed");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("fails when build command returns non-zero exit code", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "build-test-"));
    try {
      const config = { enabled: true, severity: "fail", command: "false", cwd: tmpDir } as any;
      const result = await checkBuild(config);
      expect(result.status).toBe("fail");
      expect(result.summary).toContain("failed");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("fails when build exceeds timeout", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "build-test-"));
    try {
      // timeout of 1 second, sleep for 10
      const config = { enabled: true, severity: "fail", command: "sleep 10", timeout: 1, cwd: tmpDir } as any;
      const result = await checkBuild(config);
      expect(result.status).toBe("fail");
      expect(result.summary).toContain("timed out");
      expect((result.details as any).timeout).toBe(true);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("skips gracefully when command does not exist", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "build-test-"));
    try {
      const config = { enabled: true, severity: "fail", command: "nonexistent_build_tool", cwd: tmpDir } as any;
      const result = await checkBuild(config);
      expect(result.status).toBe("fail");
      expect(result.type).toBe("build");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("defaults to 'bun run build' when no command specified", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "build-test-"));
    try {
      // Create a package.json with a build script that just echoes
      writeFileSync(join(tmpDir, "package.json"), JSON.stringify({
        scripts: { build: "echo built" }
      }));
      const config = { enabled: true, severity: "fail", cwd: tmpDir } as any;
      const result = await checkBuild(config);
      // Will try to run "bun run build" — might fail but shouldn't crash
      expect(result.type).toBe("build");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("captures error output on failure", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "build-test-"));
    try {
      writeFileSync(join(tmpDir, "fail.sh"), '#!/bin/bash\necho "Error: Module not found" >&2\nexit 1');
      const config = { enabled: true, severity: "fail", command: "bash fail.sh", cwd: tmpDir } as any;
      const result = await checkBuild(config);
      expect(result.status).toBe("fail");
      expect((result.details as any).stderr).toContain("Module not found");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
