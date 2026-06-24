import type { AutoFixConfig, AutoFixResult, FixAction } from "./types";
import { canAutoFix } from "./safety";
import { findBlockedFiles } from "./fixers/remove-files";
import { generateGitignoreUpdates } from "./fixers/gitignore";
import { findTrailingWhitespace, findMissingEofNewline } from "./fixers/whitespace";
import { findHardcodedSecrets, type SecretLocation } from "./fixers/secrets";
import { findLinterAutofixable } from "./fixers/lint";

export type { AutoFixConfig, AutoFixResult, FixAction } from "./types";
export {
  extractSecretsToEnv,
  updateEnvExample,
  findHardcodedSecrets,
  type SecretLocation,
  type SecretExtraction,
} from "./fixers/secrets";
export { findLinterAutofixable } from "./fixers/lint";
export { fixTrailingWhitespace, fixEofNewline } from "./fixers/whitespace";
export { generateGitignoreUpdates } from "./fixers/gitignore";
export { isProtectedBranch, canAutoFix } from "./safety";

export interface PlanOptions {
  currentGitignore?: string;
  /** Secret findings (file + line) from the secrets check, for extraction. */
  secretLocations?: SecretLocation[];
}

export function planAutoFixes(
  files: { path: string; content: string; status: string }[],
  branch: string,
  config: AutoFixConfig,
  options: PlanOptions | string = {},
): AutoFixResult {
  // Back-compat: the 4th arg used to be the gitignore string.
  const opts: PlanOptions = typeof options === "string" ? { currentGitignore: options } : options;
  const currentGitignore = opts.currentGitignore ?? "";

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

  // Extract hardcoded secrets to environment variables
  if (config.fixes.extract_secrets && opts.secretLocations?.length) {
    allActions.push(...findHardcodedSecrets(files, opts.secretLocations));
  }

  // Trailing whitespace
  if (config.fixes.trailing_whitespace) {
    allActions.push(...findTrailingWhitespace(files));
  }

  // EOF newline
  if (config.fixes.eof_newline) {
    allActions.push(...findMissingEofNewline(files));
  }

  // Linter --fix (plan only — runner executes the subprocess)
  if (config.fixes.linter_autofix) {
    allActions.push(...findLinterAutofixable(files));
  }

  return { applied: allActions, skipped };
}
