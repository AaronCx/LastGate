import { readFile, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import {
  planAutoFixes,
  fixTrailingWhitespace,
  fixEofNewline,
  generateGitignoreUpdates,
  type AutoFixConfig,
} from "@lastgate/engine/src/autofix";

// Safe defaults: the deterministic, idempotent fixes are on; the risky ones
// (extract_secrets rewrites source; linter_autofix shells out) are OFF.
const SAFE_CONFIG: AutoFixConfig = {
  enabled: true,
  fixes: {
    remove_blocked_files: true,
    update_gitignore: true,
    trailing_whitespace: true,
    eof_newline: true,
    linter_autofix: false,
    extract_secrets: false,
  },
  protected_branches: ["main", "master", "production", "release/*"],
  require_approval: false,
};

// Only these are applied automatically. extract_secret/linter_fix are reported
// as "manual" — they rewrite code / run subprocesses and aren't safe to apply blind.
const AUTO_APPLIABLE = new Set(["fix_whitespace", "fix_eof", "remove_file", "update_gitignore"]);

export interface FixReport {
  applied: { type: string; file: string }[];
  manual: { type: string; file: string }[];
  failed: { file: string; reason: string }[];
  blocked?: string;
}

/**
 * Apply safe auto-fixes to the WORKING TREE. We read each changed file's
 * on-disk content (NOT the git blob the scan used) so fixes are applied to what
 * the user actually has, avoiding any blob/working-tree divergence.
 */
export async function runFix(
  changed: { path: string; status: string }[],
  branch: string,
  cwd: string = process.cwd(),
): Promise<FixReport> {
  const files: { path: string; content: string; status: string }[] = [];
  for (const f of changed) {
    let content = "";
    try {
      content = await readFile(resolve(cwd, f.path), "utf8");
    } catch {
      content = "";
    }
    files.push({ path: f.path, content, status: f.status });
  }

  const plan = planAutoFixes(files, branch, SAFE_CONFIG);
  if (plan.error) return { applied: [], manual: [], failed: [], blocked: plan.error };

  const report: FixReport = { applied: [], manual: [], failed: [] };

  for (const action of plan.applied) {
    if (!AUTO_APPLIABLE.has(action.type)) {
      report.manual.push({ type: action.type, file: action.file });
      continue;
    }
    const full = resolve(cwd, action.file);
    try {
      if (action.type === "remove_file") {
        await rm(full, { force: true });
      } else if (action.type === "fix_whitespace") {
        const c = await readFile(full, "utf8");
        const fixed = fixTrailingWhitespace(c);
        if (fixed !== c) await writeFile(full, fixed);
      } else if (action.type === "fix_eof") {
        const c = await readFile(full, "utf8");
        const fixed = fixEofNewline(c);
        if (fixed !== c) await writeFile(full, fixed);
      } else if (action.type === "update_gitignore") {
        let current = "";
        try {
          current = await readFile(full, "utf8");
        } catch {
          current = "";
        }
        const removed = plan.applied
          .filter((a) => a.type === "remove_file")
          .map((a) => ({ path: a.file }));
        const { entries } = generateGitignoreUpdates(current, removed);
        if (entries.length) {
          const sep = current && !current.endsWith("\n") ? "\n" : "";
          await writeFile(full, current + sep + entries.join("\n") + "\n");
        }
      }
      report.applied.push({ type: action.type, file: action.file });
    } catch (err) {
      report.failed.push({ file: action.file, reason: err instanceof Error ? err.message : String(err) });
    }
  }

  return report;
}
