import { Command } from "commander";
import { watch as fsWatch, type WatchEventType } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

import { dim, info, success } from "../output/colors";

interface WatchOptions {
  profile?: "fast" | "full";
  debounceMs?: number;
  dir?: string;
}

const IGNORED_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next",
  "out", ".turbo", ".cache", "__pycache__", ".venv",
]);

function isIgnored(path: string): boolean {
  for (const seg of path.split(/[\\/]+/)) {
    if (IGNORED_DIRS.has(seg)) return true;
  }
  return false;
}

function spawnCheck(profile: "fast" | "full", print: (s: string) => void): Promise<number> {
  return new Promise((res) => {
    print(info(`  running: lastgate check --staged --profile ${profile}`));
    const child = spawn("lastgate", ["check", "--staged", "--profile", profile], {
      stdio: "inherit",
    });
    child.once("exit", (code) => res(code ?? 1));
    child.once("error", () => res(1));
  });
}

export interface WatchHandle {
  /** Resolves when the user-visible watch loop exits. */
  done: Promise<void>;
  stop: () => void;
}

export function startWatch(
  options: WatchOptions,
  print: (s: string) => void = (s) => console.log(s),
): WatchHandle {
  const dir = resolve(options.dir ?? process.cwd());
  const profile: "fast" | "full" = options.profile === "full" ? "full" : "fast";
  const debounceMs = options.debounceMs ?? 400;

  print(info(`Watching ${dir}`));
  print(dim(`  (Ctrl-C to stop)`));

  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let queued = false;
  let stopped = false;

  const trigger = () => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      if (running) {
        queued = true;
        return;
      }
      running = true;
      try {
        await spawnCheck(profile, print);
      } finally {
        running = false;
        if (queued) {
          queued = false;
          trigger();
        }
      }
    }, debounceMs);
  };

  const onChange = (_event: WatchEventType, filename: string | null) => {
    if (!filename) return;
    if (isIgnored(filename)) return;
    print(dim(`  changed: ${filename}`));
    trigger();
  };

  let watcher: ReturnType<typeof fsWatch> | undefined;
  try {
    watcher = fsWatch(dir, { recursive: true }, onChange);
  } catch (err) {
    print(`Failed to start watcher: ${(err as Error).message}`);
    return { done: Promise.resolve(), stop: () => {} };
  }

  const done = new Promise<void>((res) => {
    watcher!.once("close", () => res());
    process.once("SIGINT", () => {
      stop();
      res();
    });
  });

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (timer) clearTimeout(timer);
    watcher?.close();
    print(success("Watch stopped."));
  };

  return { done, stop };
}

export function registerWatchCommand(program: Command): void {
  program
    .command("watch")
    .description(
      "Re-run `lastgate check --staged --profile fast` on file save. Debounced; queues a re-run while another is in flight.",
    )
    .option("--profile <profile>", "Profile to use (fast|full). Default fast.", "fast")
    .option("--debounce <ms>", "Debounce window in milliseconds (default 400).", "400")
    .option("--dir <dir>", "Directory to watch (default cwd).")
    .action(async (opts: { profile?: string; debounce?: string; dir?: string }) => {
      const handle = startWatch({
        profile: opts.profile === "full" ? "full" : "fast",
        debounceMs: opts.debounce ? Number(opts.debounce) : 400,
        dir: opts.dir,
      });
      await handle.done;
    });
}
