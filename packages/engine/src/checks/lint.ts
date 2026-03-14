import { execFile } from "node:child_process";
import type { ChangedFile, CheckResult, LintCheckConfig } from "../types";
import { existsSync } from "fs";
import { join } from "path";

async function runCommand(command: string, cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const parts = command.split(/\s+/);
  const [cmd, ...args] = parts;

  return new Promise((resolve) => {
    const child = execFile(cmd, args, {
      cwd: cwd ?? process.cwd(),
      maxBuffer: 10 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      resolve({
        exitCode: error ? (child.exitCode ?? 1) : 0,
        stdout: stdout || "",
        stderr: stderr || "",
      });
    });
  });
}

function detectLinter(cwd: string): string | null {
  if (existsSync(join(cwd, "biome.json")) || existsSync(join(cwd, "biome.jsonc"))) {
    return "bunx biome check .";
  }

  const eslintConfigs = [
    ".eslintrc", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.json",
    ".eslintrc.yml", ".eslintrc.yaml",
    "eslint.config.js", "eslint.config.mjs", "eslint.config.cjs",
  ];
  for (const config of eslintConfigs) {
    if (existsSync(join(cwd, config))) {
      return "bunx eslint .";
    }
  }

  if (existsSync(join(cwd, "pyproject.toml"))) {
    return "ruff check .";
  }

  return null;
}

interface LintError {
  file?: string;
  line?: number;
  message: string;
}

function parseOutput(stdout: string, stderr: string): LintError[] {
  const errors: LintError[] = [];
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;

    const match = line.match(/^(.+?):(\d+)(?::\d+)?:\s*(?:error|Error|ERR)\s*(.+)/);
    if (match) {
      errors.push({
        file: match[1],
        line: parseInt(match[2], 10),
        message: match[3].trim(),
      });
      continue;
    }

    const errorMatch = line.match(/^(?:error|Error|ERROR)[:\s]+(.+)/);
    if (errorMatch) {
      errors.push({ message: errorMatch[1].trim() });
    }
  }

  return errors;
}

export async function checkLint(
  files: ChangedFile[],
  config: LintCheckConfig,
): Promise<CheckResult> {
  const cwd = (config as LintCheckConfig & { cwd?: string }).cwd ?? process.cwd();
  let command: string;

  if (config.command) {
    command = config.command;
  } else {
    const detected = detectLinter(cwd);
    if (!detected) {
      return {
        type: "lint",
        status: "pass",
        title: "Lint & Type Check",
        summary: "No linter configuration detected, skipping",
        details: { skipped: true },
      };
    }
    command = detected;
  }

  try {
    const result = await runCommand(command, cwd);

    if (result.exitCode === 0) {
      return {
        type: "lint",
        status: "pass",
        title: "Lint & Type Check",
        summary: `Lint check passed (${command})`,
        details: { command },
      };
    }

    const errors = parseOutput(result.stdout, result.stderr);

    return {
      type: "lint",
      status: "fail",
      title: "Lint & Type Check",
      summary: `Lint check failed with ${errors.length} error(s) (${command})`,
      details: {
        command,
        errors,
        errorCount: errors.length,
        stdout: result.stdout.substring(0, 2000),
        stderr: result.stderr.substring(0, 2000),
      },
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      type: "lint",
      status: "fail",
      title: "Lint & Type Check",
      summary: `Lint command failed to execute: ${errMsg}`,
      details: { error: errMsg },
    };
  }
}
