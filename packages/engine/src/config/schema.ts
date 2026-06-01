import { z } from "zod";
import type { PipelineConfig } from "../types";

const severitySchema = z.enum(["fail", "warn"]).optional();
const findingSeveritySchema = z.enum(["critical", "high", "medium", "low"]).optional();
const profileSchema = z.enum(["fast", "full"]).optional();

const secretsCheckSchema = z.object({
  enabled: z.boolean().default(true),
  severity: severitySchema,
  // PR-2: configurable entropy floor + severity tag for entropy-only findings.
  entropy_threshold: z.number().min(0).max(10).optional(),
  entropy_severity: findingSeveritySchema,
  // PR-3: per-check path allowlist (merged with the top-level `allow`).
  allow: z.array(z.string()).optional(),
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
  enabled: z.boolean().default(true),
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
  allow: z.array(z.string()).optional(),
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
  }).optional(),
  // PR-3: top-level path allowlist applied to every content-scanning check.
  allow: z.array(z.string()).optional(),
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
