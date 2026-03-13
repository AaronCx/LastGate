import type { CheckResult, BuildCheckConfig } from "../types";

export async function checkBuild(
  config: BuildCheckConfig,
): Promise<CheckResult> {
  const command = config.command ?? "bun run build";
  const timeoutMs = (config.timeout ?? 120) * 1000;
  const cwd = (config as BuildCheckConfig & { cwd?: string }).cwd ?? process.cwd();

  const parts = command.split(/\s+/);

  try {
    const proc = Bun.spawn(parts, {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });

    const timeoutPromise = new Promise<"timeout">((resolve) => {
      setTimeout(() => resolve("timeout"), timeoutMs);
    });

    const exitPromise = proc.exited;
    const result = await Promise.race([exitPromise, timeoutPromise]);

    if (result === "timeout") {
      proc.kill();
      return {
        type: "build",
        status: "fail",
        title: "Build Verifier",
        summary: `Build timed out after ${config.timeout ?? 120}s (${command})`,
        details: { command, timeout: true, timeoutSeconds: config.timeout ?? 120 },
      };
    }

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    const exitCode = result as number;

    if (exitCode === 0) {
      return {
        type: "build",
        status: "pass",
        title: "Build Verifier",
        summary: `Build passed (${command})`,
        details: { command, exitCode },
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
