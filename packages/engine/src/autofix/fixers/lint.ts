import type { FixAction } from "../types";

const LINTABLE = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".vue", ".svelte",
]);

function isLintable(path: string): boolean {
  const dot = path.lastIndexOf(".");
  return dot !== -1 && LINTABLE.has(path.slice(dot).toLowerCase());
}

/**
 * Plan a `<linter> --fix` pass over the changed lintable files. The fix itself
 * is deterministic but runs in the linter (a subprocess), so this emits a plan
 * action the runner executes — the engine stays pure and serverless-safe.
 */
export function findLinterAutofixable(
  files: { path: string; status: string }[],
): FixAction[] {
  const targets = files
    .filter((f) => f.status !== "removed")
    .map((f) => f.path)
    .filter(isLintable);

  if (targets.length === 0) return [];
  return [
    {
      type: "linter_fix",
      file: targets.join(", "),
      description: `Run the linter's --fix on ${targets.length} changed file${targets.length === 1 ? "" : "s"}`,
    },
  ];
}
