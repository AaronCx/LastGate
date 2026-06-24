import type { AutoFixConfig } from "./types";

export function isProtectedBranch(branch: string, protectedBranches: string[]): boolean {
  // Detached HEAD / unknown branch → protect (fail closed; never auto-mutate).
  if (!branch || branch === "HEAD") return true;
  for (const pattern of protectedBranches) {
    if (pattern === "*") return true; // match-all (previously fell open → unprotected)
    if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, -1); // "release/*" -> "release/"
      if (branch.startsWith(prefix)) return true;
    } else if (branch === pattern) {
      return true;
    }
  }
  return false;
}

export function canAutoFix(branch: string, config: AutoFixConfig): { allowed: boolean; reason?: string } {
  if (!config.enabled) {
    return { allowed: false, reason: "Auto-fix is disabled" };
  }

  if (isProtectedBranch(branch, config.protected_branches)) {
    return { allowed: false, reason: `Branch "${branch}" is protected — auto-fix is not allowed` };
  }

  return { allowed: true };
}
