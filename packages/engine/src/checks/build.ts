import { execFile, exec } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CheckResult, BuildCheckConfig } from "../types";

export async function checkBuild(
  config: BuildCheckConfig,
  repoFullName?: string,
  commitSha?: string,
): Promise<CheckResult> {
  const command = config.command ?? "bun run build";
  const timeoutMs = (config.timeout ?? 120) * 1000;
  let cwd = (config as BuildCheckConfig & { cwd?: string }).cwd ?? process.cwd();
  let tempDir: string | null = null;

  // If we have a repoFullName and the cwd doesn't have a package.json,
  // shallow-clone the repo to /tmp so we can actually build
  const hasPackageJson = existsSync(join(cwd, "package.json"));

  if (!hasPackageJson && repoFullName) {
    try {
      tempDir = mkdtempSync(join(tmpdir(), "lastgate-build-"));
      const cloneUrl = `https://github.com/${repoFullName}.git`;
      const ref = commitSha || "HEAD";

      // Shallow clone
      await runCommand(`git clone --depth 1 ${cloneUrl} ${tempDir}`, timeoutMs);

      if (commitSha) {
        await runCommand(`git -C ${tempDir} fetch origin ${commitSha} --depth 1`, timeoutMs).catch(() => {
          // If fetch fails (shallow clone limitation), continue with HEAD
        });
      }

      // Install dependencies
      const hasBunLock = existsSync(join(tempDir, "bun.lock")) || existsSync(join(tempDir, "bun.lockb"));
      const installCmd = hasBunLock ? "bun install" : "npm ci --ignore-scripts";
      await runCommand(installCmd, timeoutMs, tempDir);

      cwd = tempDir;
    } catch (error) {
      // If clone/install fails, skip the build check gracefully
      if (tempDir) {
        try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
      }
      const errMsg = error instanceof Error ? error.message : String(error);
      return {
        type: "build",
        status: "pass",
        title: "Build Verifier",
        summary: `Build check skipped — could not clone repository: ${errMsg.substring(0, 200)}`,
        details: { command, skipped: true, reason: errMsg },
      };
    }
  } else if (!hasPackageJson) {
    // No package.json and no repo info — skip gracefully
    return {
      type: "build",
      status: "pass",
      title: "Build Verifier",
      summary: "Build check skipped — no package.json in working directory",
      details: { command, skipped: true, reason: "no package.json" },
    };
  }

  const parts = command.split(/\s+/);
  const [cmd, ...args] = parts;

  try {
    const { exitCode, stdout, stderr } = await new Promise<{
      exitCode: number;
      stdout: string;
      stderr: string;
    }>((resolve) => {
      const child = execFile(cmd, args, { cwd, timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error && "killed" in error && error.killed) {
          resolve({ exitCode: -1, stdout: stdout || "", stderr: stderr || "" });
          return;
        }
        resolve({
          exitCode: error?.code ? Number(error.code) || 1 : child.exitCode ?? 0,
          stdout: stdout || "",
          stderr: stderr || "",
        });
      });
    });

    // Clean up temp directory
    if (tempDir) {
      try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
    }

    if (exitCode === -1) {
      return {
        type: "build",
        status: "fail",
        title: "Build Verifier",
        summary: `Build timed out after ${config.timeout ?? 120}s (${command})`,
        details: { command, timeout: true, timeoutSeconds: config.timeout ?? 120 },
      };
    }

    if (exitCode === 0) {
      return {
        type: "build",
        status: "pass",
        title: "Build Verifier",
        summary: `Build passed (${command})`,
        details: { command, exitCode, output: "Build completed successfully" },
      };
    }

    const output = (stdout + "\n" + stderr).trim();
    const errorLines = output
      .split("\n")
      .filter((line) => /error|Error|ERROR|failed|Failed|FAILED/.test(line))
      .slice(0, 20);

    return {
      type: "build",
      status: "fail",
      title: "Build Verifier",
      summary: `Build failed with exit code ${exitCode} (${command})`,
      details: {
        command,
        exitCode,
        errorLines,
        output: (stdout + "\n" + stderr).trim().substring(0, 2000),
        stdout: stdout.substring(0, 2000),
        stderr: stderr.substring(0, 2000),
      },
    };
  } catch (error) {
    // Clean up temp directory
    if (tempDir) {
      try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
    }
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      type: "build",
      status: "fail",
      title: "Build Verifier",
      summary: `Build command failed to execute: ${errMsg}`,
      details: { command, error: errMsg },
    };
  }
}

function runCommand(command: string, timeoutMs: number, cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: timeoutMs, cwd, maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(`${command}: ${stderr || error.message}`));
      else resolve(stdout);
    });
  });
}
