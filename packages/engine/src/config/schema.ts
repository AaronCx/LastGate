import { z } from "zod";
import type { PipelineConfig } from "../types";

const severitySchema = z.enum(["fail", "warn"]).optional();
const findingSeveritySchema = z.enum(["critical", "high", "medium", "low"]).optional();
const profileSchema = z.enum(["fast", "full"]).optional();

// An allow glob matches "everything" when, after stripping wildcards and path
// separators, no concrete literal remains — e.g. a lone "**", a double-star
// followed by "/*", a single "*", etc. A single such entry silenced both
// secret-scanning and dangerous-file blocking for the entire diff, and was
// settable from a PR's own .lastgate.yml. Allow lists must name a concrete
// path or prefix.
function isUnboundedAllowGlob(glob: string): boolean {
  return glob.trim().replace(/[*?/.\\]/g, "").length === 0;
}

const allowGlobArray = z
  .array(
    z.string().refine((g) => !isUnboundedAllowGlob(g), {
      message:
        "allow glob is too broad (it matches every path); name a concrete path or prefix instead of '**'",
    }),
  )
  .optional();

const secretsCheckSchema = z.object({
  enabled: z.boolean().default(true),
  severity: severitySchema,
  // PR-2: configurable entropy floor + severity tag for entropy-only findings.
  entropy_threshold: z.number().min(0).max(10).optional(),
  entropy_severity: findingSeveritySchema,
  // PR-3: per-check path allowlist (merged with the top-level `allow`).
  allow: allowGlobArray,
  // PR-4: run profile override.
  profile: profileSchema,
  custom_patterns: z.array(z.object({
    name: z.string(),
    pattern: z.string(),
    severity: z.enum(["high", "critical"]).optional(),
  })).optional(),
}).optional();

const duplicatesCheckSchema = z.object({
  enabled: z.boolean().default(true),
  severity: severitySchema,
  lookback: z.number().min(1).max(100).default(10),
  profile: profileSchema,
}).optional();

const lintCheckSchema = z.object({
  enabled: z.boolean().default(true),
  severity: severitySchema,
  command: z.string().optional(),
  profile: profileSchema,
}).optional();

const buildCheckSchema = z.object({
  // Off by default (matches getDefaultConfig + the policy packs). The build
  // verifier is full-profile-only and delegates to CI on serverless, so it must
  // not silently turn on just because a user sets a sibling field like `command`.
  enabled: z.boolean().default(false),
  severity: severitySchema,
  command: z.string().optional(),
  timeout: z.number().min(1).max(3600).default(120),
  profile: profileSchema,
}).optional();

const dependenciesCheckSchema = z.object({
  enabled: z.boolean().default(true),
  severity: severitySchema,
  fail_on: z.enum(["low", "moderate", "high", "critical"]).default("critical"),
  profile: profileSchema,
}).optional();

const filePatternsCheckSchema = z.object({
  enabled: z.boolean().default(true),
  severity: severitySchema,
  block: z.array(z.string()).optional(),
  allow: allowGlobArray,
  profile: profileSchema,
}).optional();

const commitMessageCheckSchema = z.object({
  enabled: z.boolean().default(true),
  severity: severitySchema,
  require_conventional: z.boolean().default(true),
  profile: profileSchema,
}).optional();

const agentPatternsCheckSchema = z.object({
  enabled: z.boolean().default(true),
  severity: severitySchema,
  profile: profileSchema,
}).optional();

// Semantic review tier (LLM). Opt-in (enabled defaults false); warn-by-default; cost-bounded.
const semanticCheckSchema = z.object({
  enabled: z.boolean().default(false),
  severity: z.enum(["fail", "warn"]).default("warn"),
  model: z.string().optional(),
  token_budget: z.number().min(1).max(1_000_000).default(20000),
  policy: z.string().optional(),
  run_only_on_clean: z.boolean().default(true),
  profile: profileSchema,
}).optional();

const pipelineConfigSchema = z.object({
  checks: z.object({
    secrets: secretsCheckSchema,
    duplicates: duplicatesCheckSchema,
    lint: lintCheckSchema,
    build: buildCheckSchema,
    dependencies: dependenciesCheckSchema,
    file_patterns: filePatternsCheckSchema,
    commit_message: commitMessageCheckSchema,
    agent_patterns: agentPatternsCheckSchema,
    semantic: semanticCheckSchema,
  }).optional(),
  // PR-3: top-level path allowlist applied to every content-scanning check.
  allow: allowGlobArray,
  // PR-3: path to the baseline file holding accepted finding fingerprints.
  baseline: z.string().optional(),
  protected_branches: z.array(z.string()).optional(),
  notifications: z.object({
    slack_webhook: z.string().optional(),
    email: z.string().optional(),
  }).optional(),
  agent_feedback: z.object({
    format: z.enum(["structured", "human-readable", "both"]),
  }).optional(),
});

export function validateConfig(data: unknown): PipelineConfig {
  const parsed = pipelineConfigSchema.parse(data);
  return parsed as PipelineConfig;
}
