import { Command } from "commander";
import ora from "ora";
import {
  DEFAULT_BASELINE_PATH,
  fingerprint,
  loadBaseline,
  runCheckPipeline,
  writeBaseline,
} from "@lastgate/engine";
import type { PipelineInput, CheckResult } from "@lastgate/engine";
import { getStagedDiff, getBranchDiff } from "../git/diff";
import { getCurrentCommitInfo } from "../git/commits";
import { success, error, dim } from "../output/colors";

interface BaselineOptions {
  prune?: boolean;
  branch?: string;
  path?: string;
}

interface FindingRow {
  file: string;
  pattern: string;
  match?: string;
}

async function isGitRepo(): Promise<boolean> {
  try {
    const { execSync } = await import("node:child_process");
    execSync("git rev-parse --git-dir", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function fingerprintsFromRun(branch?: string): Promise<string[]> {
  const changedFiles = branch
    ? await getBranchDiff(branch)
    : await getStagedDiff();
  const commitInfo = await getCurrentCommitInfo();
  const input: PipelineInput = {
    files: changedFiles,
    commits: [commitInfo],
    branch: branch ?? "HEAD",
    repoFullName: "local/baseline",
  };
  const result = await runCheckPipeline(input);

  const fps = new Set<string>();
  for (const check of result.checks as CheckResult[]) {
    if (check.type !== "secrets") continue;
    const findings = (check.details as { findings?: FindingRow[] })?.findings ?? [];
    for (const f of findings) {
      fps.add(
        fingerprint({
          check: "secrets",
          file: f.file,
          rule: f.pattern,
          redactedMatch: f.match,
        }),
      );
    }
  }
  return [...fps];
}

async function runBaseline(options: BaselineOptions): Promise<void> {
  if (!(await isGitRepo())) {
    console.error(error("\n✖ Not a git repository.\n"));
    process.exit(1);
  }

  const path = options.path ?? DEFAULT_BASELINE_PATH;
  const spinner = ora("Collecting current findings...").start();

  try {
    const currentFps = await fingerprintsFromRun(options.branch);
    const existing = await loadBaseline(path);

    if (options.prune) {
      const currentSet = new Set(currentFps);
      const pruned = [...existing].filter((fp) => currentSet.has(fp));
      const removedCount = existing.size - pruned.length;
      await writeBaseline(path, pruned);
      spinner.succeed(
        success(
          `Pruned baseline: ${pruned.length} kept, ${removedCount} stale fingerprint(s) removed → ${path}`,
        ),
      );
    } else {
      const merged = new Set([...existing, ...currentFps]);
      await writeBaseline(path, [...merged]);
      const added = merged.size - existing.size;
      spinner.succeed(
        success(
          `Baseline updated: ${merged.size} fingerprint(s) total (+${added} new) → ${path}`,
        ),
      );
      console.log(dim("  Re-run `lastgate check` to confirm these are now suppressed."));
    }
  } catch (err) {
    spinner.fail(error(`Failed: ${(err as Error).message}`));
    process.exit(2);
  }
}

export function registerBaselineCommand(program: Command): void {
  program
    .command("baseline")
    .description(
      "Snapshot current check findings as accepted into .lastgate-baseline.json (or prune stale entries with --prune).",
    )
    .option("--prune", "Remove fingerprints from the baseline that no longer appear in current findings.")
    .option("--branch <branch>", "Compare against the merge-base with this branch instead of --staged.")
    .option("--path <path>", `Baseline file path (default ${DEFAULT_BASELINE_PATH}).`)
    .action(runBaseline);
}
