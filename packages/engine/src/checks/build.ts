import { execFile } from "node:child_process";
import type { CheckResult, BuildCheckConfig } from "../types";

export async function checkBuild(
  config: BuildCheckConfig,
): Promise<CheckResult> {
  const command = config.command ?? "bun run build";
  const timeoutMs = (config.timeout ?? 120) * 1000;
  const cwd = (config as BuildCheckConfig & { cwd?: string }).cwd ?? process.cwd();

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
