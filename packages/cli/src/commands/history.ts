import { Command } from "commander";
import ora from "ora";
import { loadCliConfig, CONFIG_PATH } from "./login";
import { error, dim, bold, success, warning, info } from "../output/colors";
import { PASS, FAIL, WARN } from "../output/colors";

const API_BASE = process.env.LASTGATE_API_URL || "https://lastgate.vercel.app";

interface HistoryOptions {
  repo?: string;
  limit: string;
}

interface HistoryEntry {
  id: string;
  repo: string;
  branch: string;
  status: "pass" | "fail" | "warn";
  checksRun: number;
  failures: number;
  warnings: number;
  timestamp: string;
  commitHash: string;
}

function formatStatus(status: "pass" | "fail" | "warn"): string {
  switch (status) {
    case "pass":
      return success(PASS);
    case "fail":
      return error(FAIL);
    case "warn":
      return warning(WARN);
  }
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function padCol(text: string, width: number): string {
  return text.padEnd(width);
}

async function runHistory(options: HistoryOptions): Promise<void> {
  const config = await loadCliConfig();

  if (!config.token) {
    console.log("");
    console.log(error("Not authenticated."));
    console.log(dim(`  Run ${bold("lastgate login")} to authenticate first.`));
    console.log("");
    process.exit(1);
  }

  const spinner = ora("Fetching check history...").start();

  try {
    const params = new URLSearchParams();
    params.set("limit", options.limit);
    if (options.repo) params.set("repo", options.repo);

    const url = `${API_BASE}/api/checks?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401) {
      spinner.fail("Authentication expired");
      console.log(dim(`  Run ${bold("lastgate login")} to re-authenticate.`));
      process.exit(1);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`API error (${response.status}): ${body}`);
    }

    const data = (await response.json()) as { entries: HistoryEntry[] };
    const entries = data.entries;

    spinner.stop();

    if (entries.length === 0) {
      console.log("");
      console.log(dim("  No check history found."));
      console.log("");
      return;
    }

    console.log("");
    console.log(bold("Recent Check History"));
    console.log("");

    // Table header
    const header = [
      padCol("  Status", 10),
      padCol("Repository", 30),
      padCol("Branch", 20),
      padCol("Commit", 10),
      padCol("Checks", 10),
      padCol("When", 12),
    ].join("");

    console.log(dim(header));
    console.log(dim("  " + "\u2500".repeat(88)));

    for (const entry of entries) {
      const status = formatStatus(entry.status);
      const repo = padCol(entry.repo, 30);
      const branch = padCol(entry.branch, 20);
      const commit = padCol(entry.commitHash.slice(0, 7), 10);
      const checks = padCol(
        `${entry.checksRun}${entry.failures > 0 ? ` (${entry.failures}F)` : ""}${entry.warnings > 0 ? ` (${entry.warnings}W)` : ""}`,
        10
      );
      const when = formatTimestamp(entry.timestamp);

      console.log(`  ${status}       ${repo}${branch}${commit}${checks}${dim(when)}`);
    }

    console.log("");
  } catch (err) {
    spinner.fail("Failed to fetch history");
    console.error(error(err instanceof Error ? err.message : String(err)));
    process.exit(2);
  }
}

export function registerHistoryCommand(program: Command): void {
  program
    .command("history")
    .description("Show recent check history from the LastGate dashboard")
    .option("--repo <repo>", "Filter by repository name")
    .option("--limit <count>", "Maximum number of entries to show", "10")
    .action(runHistory);
}
