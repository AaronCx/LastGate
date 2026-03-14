import { Command } from "commander";
import ora from "ora";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { runCheckPipeline } from "@lastgate/engine";
import type { PipelineInput, CommitInfo } from "@lastgate/engine";
import { getStagedDiff, getBranchDiff } from "../git/diff";
import { getCurrentCommitInfo } from "../git/commits";
import { formatCheckResults, formatResultsJson } from "../output/formatter";
import { error } from "../output/colors";

interface CheckOptions {
  only?: string;
  branch?: string;
  json?: boolean;
  verbose?: boolean;
}

async function loadConfig(): Promise<Record<string, unknown> | undefined> {
  const configPath = resolve(process.cwd(), ".lastgate.yml");
  try {
    const content = await readFile(configPath, "utf-8");
    // Basic YAML parsing — the engine handles full parsing
    return { raw: content, path: configPath };
  } catch {
    return undefined;
  }
}

async function runCheck(options: CheckOptions): Promise<void> {
  const spinner = ora("Gathering changes...").start();

  try {
    // Get changed files
    const changedFiles = options.branch
      ? await getBranchDiff(options.branch)
      : await getStagedDiff();

    if (changedFiles.length === 0) {
      spinner.warn("No changes found to check.");
      process.exit(0);
    }

    spinner.text = `Found ${changedFiles.length} changed file${changedFiles.length !== 1 ? "s" : ""}. Running checks...`;

    // Get commit info
    let commits: CommitInfo[];
    try {
      const commitInfo = await getCurrentCommitInfo();
      commits = [commitInfo];
    } catch {
      // No commits yet — provide a placeholder
      commits = [{
        sha: "0000000",
        author: "unknown",
        message: "",
        timestamp: new Date().toISOString(),
      }];
    }

    // Load config
    const config = await loadConfig();

    // Determine current branch
    const { execSync } = await import("child_process");
    const branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();

    // Determine repo name from git remote
    let repoFullName = "local/repo";
    try {
      const remoteUrl = execSync("git remote get-url origin", { encoding: "utf-8" }).trim();
      const match = remoteUrl.match(/[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
      if (match) repoFullName = `${match[1]}/${match[2]}`;
    } catch {
      // no remote — use default
    }

    // Build pipeline input
    const input: PipelineInput = {
      files: changedFiles,
      commits,
      branch,
      repoFullName,
      config: config as any,
    };

    // Run the pipeline
    const results = await runCheckPipeline(input);

    spinner.stop();

    // Output results
    if (options.json) {
      console.log(formatResultsJson(results));
    } else {
      console.log(formatCheckResults(results));
    }

    // Exit with code 1 if any failures
    const hasFailures = results.checks.some((c) => c.status === "fail");
    if (hasFailures) {
      process.exit(1);
    }
  } catch (err) {
    spinner.fail("Check failed");
    console.error(error(err instanceof Error ? err.message : String(err)));
    process.exit(2);
  }
}

export function registerCheckCommand(program: Command): void {
  program
    .command("check")
    .description("Run pre-flight checks on staged changes")
    .option("--only <checks>", "Comma-separated list of check names to run")
    .option("--branch <branch>", "Compare against a target branch instead of staged changes")
    .option("--json", "Output results as JSON")
    .option("--verbose", "Show detailed output")
    .action(runCheck);
}
