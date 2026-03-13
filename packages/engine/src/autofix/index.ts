import type { AutoFixConfig, AutoFixResult, FixAction } from "./types";
import { canAutoFix } from "./safety";
import { findBlockedFiles } from "./fixers/remove-files";
import { generateGitignoreUpdates } from "./fixers/gitignore";
import { findTrailingWhitespace, findMissingEofNewline } from "./fixers/whitespace";

export type { AutoFixConfig, AutoFixResult, FixAction } from "./types";

export function planAutoFixes(
  files: { path: string; content: string; status: string }[],
  branch: string,
  config: AutoFixConfig,
  currentGitignore: string = ""
): AutoFixResult {
  const check = canAutoFix(branch, config);
  if (!check.allowed) {
    return { applied: [], skipped: [], error: check.reason };
  }

  const allActions: FixAction[] = [];
  const skipped: FixAction[] = [];

  // Remove blocked files
  if (config.fixes.remove_blocked_files) {
    allActions.push(...findBlockedFiles(files));
  }

  // Update .gitignore
  if (config.fixes.update_gitignore && allActions.length > 0) {
    const removedFiles = allActions
      .filter((a) => a.type === "remove_file")
      .map((a) => ({ path: a.file }));
    const { action } = generateGitignoreUpdates(currentGitignore, removedFiles);
    if (action) allActions.push(action);
  }

  // Trailing whitespace
  if (config.fixes.trailing_whitespace) {
    allActions.push(...findTrailingWhitespace(files));
  }

  // EOF newline
  if (config.fixes.eof_newline) {
    allActions.push(...findMissingEofNewline(files));
  }

  return { applied: allActions, skipped };
}
