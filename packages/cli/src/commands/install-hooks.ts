import { Command } from "commander";
import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import { join } from "node:path";

import { dim, error, info, success } from "../output/colors";

const BEGIN_MARK = "# >>> lastgate: managed block — do not edit by hand >>>";
const END_MARK = "# <<< lastgate: managed block <<<";

interface InstallHooksOptions {
  uninstall?: boolean;
  preCommitProfile?: "fast" | "full";
  prePushProfile?: "fast" | "full";
}

interface DetectedRepo {
  root: string;
  hookDir: string;
  isHusky: boolean;
}

async function detectRepo(): Promise<DetectedRepo> {
  const { execSync } = await import("node:child_process");
  let root: string;
  try {
    root = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
  } catch {
    throw new Error("Not a git repository — run from inside a git repo.");
  }

  const huskyDir = join(root, ".husky");
  if (existsSync(huskyDir)) {
    return { root, hookDir: huskyDir, isHusky: true };
  }
  return { root, hookDir: join(root, ".git", "hooks"), isHusky: false };
}

function block(body: string): string {
  return `${BEGIN_MARK}\n${body}\n${END_MARK}\n`;
}

function stripBlock(content: string): string {
  const re = new RegExp(
    `\\n?${escapeRegex(BEGIN_MARK)}[\\s\\S]*?${escapeRegex(END_MARK)}\\n?`,
    "g",
  );
  return content.replace(re, "");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function writeHook(
  repo: DetectedRepo,
  name: string,
  body: string,
  print: (s: string) => void,
): Promise<void> {
  const path = join(repo.hookDir, name);
  await fs.mkdir(repo.hookDir, { recursive: true });

  let existing = "";
  try {
    existing = await fs.readFile(path, "utf8");
  } catch {
    // new hook
  }

  // Always re-write the managed block, leave the user's surrounding content alone.
  const stripped = stripBlock(existing);
  const header = stripped.startsWith("#!")
    ? ""
    : "#!/usr/bin/env sh\n";
  const next = `${header}${stripped}${stripped.endsWith("\n") || stripped.length === 0 ? "" : "\n"}${block(body)}`;
  await fs.writeFile(path, next);
  await fs.chmod(path, 0o755);
  print(success(`  installed ${name} → ${path}`));
}

async function removeHook(
  repo: DetectedRepo,
  name: string,
  print: (s: string) => void,
): Promise<void> {
  const path = join(repo.hookDir, name);
  let existing = "";
  try {
    existing = await fs.readFile(path, "utf8");
  } catch {
    return;
  }
  const stripped = stripBlock(existing);
  // If only the shebang remains, drop the file entirely so we don't leave an empty hook.
  if (/^#!\/usr\/bin\/env sh\s*$/.test(stripped.trim())) {
    await fs.unlink(path);
    print(dim(`  removed ${name}`));
    return;
  }
  await fs.writeFile(path, stripped);
  print(dim(`  removed managed block from ${name}`));
}

function preCommitBody(profile: "fast" | "full"): string {
  return [
    "# Run LastGate before allowing the commit.",
    `lastgate check --staged --profile ${profile} || exit $?`,
  ].join("\n");
}

function prePushBody(profile: "fast" | "full"): string {
  return [
    "# Run LastGate's full profile before pushing.",
    `lastgate check --profile ${profile} || exit $?`,
  ].join("\n");
}

export interface InstallHooksResult {
  hookDir: string;
  installed: string[];
  removed: string[];
  isHusky: boolean;
}

export async function runInstallHooks(
  opts: InstallHooksOptions,
  print: (s: string) => void = (s) => console.log(s),
): Promise<InstallHooksResult> {
  const repo = await detectRepo();
  if (repo.isHusky) {
    print(info(`  detected Husky at ${repo.hookDir} — installing there.`));
  } else {
    print(info(`  installing into ${repo.hookDir}`));
  }
  const installed: string[] = [];
  const removed: string[] = [];

  if (opts.uninstall) {
    for (const name of ["pre-commit", "pre-push"]) {
      await removeHook(repo, name, print);
      removed.push(name);
    }
  } else {
    await writeHook(repo, "pre-commit", preCommitBody(opts.preCommitProfile ?? "fast"), print);
    installed.push("pre-commit");
    await writeHook(repo, "pre-push", prePushBody(opts.prePushProfile ?? "full"), print);
    installed.push("pre-push");
  }

  return { hookDir: repo.hookDir, installed, removed, isHusky: repo.isHusky };
}

export function registerInstallHooksCommand(program: Command): void {
  program
    .command("install-hooks")
    .description(
      "Install pre-commit (fast) and pre-push (full) git hooks. Husky-aware. Idempotent — re-running updates the managed block in place.",
    )
    .option("--uninstall", "Remove the managed block from existing hooks (and delete empties).")
    .option("--pre-commit-profile <profile>", "Profile for the pre-commit hook (fast|full)", "fast")
    .option("--pre-push-profile <profile>", "Profile for the pre-push hook (fast|full)", "full")
    .action(async (opts: { uninstall?: boolean; preCommitProfile?: string; prePushProfile?: string }) => {
      try {
        const result = await runInstallHooks({
          uninstall: opts.uninstall,
          preCommitProfile: opts.preCommitProfile === "full" ? "full" : "fast",
          prePushProfile: opts.prePushProfile === "fast" ? "fast" : "full",
        });
        if (opts.uninstall) {
          console.log(success(`Removed LastGate hook blocks from ${result.removed.length} hook(s).`));
        } else {
          console.log(success(`Installed ${result.installed.length} hook(s) → ${result.hookDir}`));
        }
      } catch (err) {
        console.error(error((err as Error).message));
        process.exit(2);
      }
    });
}
