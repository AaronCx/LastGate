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
  force?: boolean;
  staged?: boolean;
  profile?: string;
  fix?: boolean;
  interactive?: boolean;
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

async function isGitRepo(): Promise<boolean> {
  try {
    const { execSync } = await import("child_process");
    execSync("git rev-parse --git-dir", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function runCheck(options: CheckOptions): Promise<void> {
  if (!(await isGitRepo())) {
    console.error(error("\n✖ Not a git repository.\n  Run this command from inside a git repo, or run `git init` first.\n"));
    process.exit(1);
  }

  // PR-6: --interactive delegates to the stepper for the same set of changes.
  if (options.interactive) {
    const { runStepper } = await import("./step");
    const profile: "fast" | "full" = options.profile === "full" ? "full" : "fast";
    const state = await runStepper({ branch: options.branch, profile });
    process.exit(state.exitCode);
  }

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
    let branch = "main";
    try {
      branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
    } catch {
      // No HEAD yet (empty repo) — use default
    }

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

    // Apply --only filter: disable all checks except the specified ones
    if (options.only) {
      const allowedChecks = new Set(options.only.split(",").map((s) => s.trim()));
      const allCheckKeys = [
        "secrets", "file_patterns", "commit_message", "duplicates",
        "lint", "build", "dependencies", "agent_patterns",
      ];
      if (!input.config) input.config = {};
      if (!(input.config as Record<string, any>).checks) {
        (input.config as Record<string, any>).checks = {};
      }
      const checks = (input.config as Record<string, any>).checks;
      for (const key of allCheckKeys) {
        if (!allowedChecks.has(key)) {
          checks[key] = { ...(checks[key] || {}), enabled: false };
        } else {
          // Ensure allowed checks have enabled: true (so they aren't overridden by a partial config)
          checks[key] = { ...(checks[key] || {}), enabled: true };
        }
      }
    }

    // PR-6: --profile picks fast (default) or full.
    const profile: "fast" | "full" = options.profile === "full" ? "full" : "fast";

    // Run the pipeline
    const results = await runCheckPipeline(input, { profile });

    spinner.stop();

    // Output results
    if (options.json) {
      console.log(formatResultsJson(results));
    } else {
      console.log(formatCheckResults(results));
    }

    // PR-6: severity-aware exit codes.
    //   0 — pass, or warnings-only, or --force
    //   1 — at least one unresolved fail-status check
    //   2 — internal error (handled by the catch block)
    const hasFailures = results.checks.some((c) => c.status === "fail");
    if (hasFailures && !options.force) {
      process.exit(1);
    }
    if (hasFailures && options.force) {
      console.log("\n⚠ Force mode: failures are non-blocking (exit 0)\n");
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
    .option("--staged", "Use staged changes (default — same as no --branch)")
    .option("--branch <branch>", "Compare against a target branch instead of staged changes")
    .option("--profile <profile>", "Run profile: fast (default, skips build) or full (everything)", "fast")
    .option("--fix", "Run autofixers before reporting (planned — currently a no-op pass-through)")
    .option("--interactive", "Pause at the first failing step. Same as `lastgate step`.")
    .option("--json", "Output results as JSON")
    .option("--verbose", "Show detailed output")
    .option("--force", "Report failures but exit 0 (non-blocking)")
    .action(runCheck);
}
