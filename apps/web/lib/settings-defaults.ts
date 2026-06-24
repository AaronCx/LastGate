/** The check keys exposed as "Global Rule Defaults" on the settings page. */
export type RuleKey =
  | "secrets"
  | "duplicates"
  | "lint"
  | "build"
  | "dependencies"
  | "agent_patterns";

export interface RuleDefault {
  enabled: boolean;
}
export type RuleDefaults = Record<RuleKey, RuleDefault>;

export const RULE_META: { key: RuleKey; name: string; desc: string; default: boolean }[] = [
  { key: "secrets", name: "Secret Scanner", desc: "Detect leaked secrets and credentials", default: true },
  { key: "duplicates", name: "Duplicate Detector", desc: "Identify code duplication", default: true },
  { key: "lint", name: "Lint & Type Check", desc: "Run linter and type checker", default: true },
  { key: "build", name: "Build Verifier", desc: "Verify the project builds", default: false },
  { key: "dependencies", name: "Dependency Audit", desc: "Scan dependencies for vulnerabilities", default: true },
  { key: "agent_patterns", name: "Agent Pattern Analysis", desc: "Track and analyze agent behavior", default: true },
];

export const RULE_KEYS: RuleKey[] = RULE_META.map((r) => r.key);

export function defaultRuleDefaults(): RuleDefaults {
  return Object.fromEntries(RULE_META.map((r) => [r.key, { enabled: r.default }])) as RuleDefaults;
}

/**
 * Keep only the known keys, each with a boolean `enabled`. Tolerates any input
 * shape (null/array/primitive) without throwing, so a malformed body or column
 * can never corrupt the settings.
 */
export function sanitizeDefaults(input: unknown): RuleDefaults {
  const base = defaultRuleDefaults();
  if (typeof input !== "object" || input === null || Array.isArray(input)) return base;
  const obj = input as Record<string, unknown>;
  for (const key of RULE_KEYS) {
    const v = obj[key];
    if (v && typeof v === "object" && typeof (v as { enabled?: unknown }).enabled === "boolean") {
      base[key] = { enabled: (v as { enabled: boolean }).enabled };
    }
  }
  return base;
}
