import { z } from "zod";
import type { PipelineConfig } from "../types";

const severitySchema = z.enum(["fail", "warn"]).optional();

const secretsCheckSchema = z.object({
  enabled: z.boolean().default(true),
  severity: severitySchema,
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
}).optional();

const lintCheckSchema = z.object({
  enabled: z.boolean().default(true),
  severity: severitySchema,
  command: z.string().optional(),
}).optional();

const buildCheckSchema = z.object({
  enabled: z.boolean().default(true),
  severity: severitySchema,
  command: z.string().optional(),
  timeout: z.number().min(1).max(3600).default(120),
}).optional();

const dependenciesCheckSchema = z.object({
  enabled: z.boolean().default(true),
  severity: severitySchema,
  fail_on: z.enum(["low", "moderate", "high", "critical"]).default("critical"),
}).optional();

const filePatternsCheckSchema = z.object({
  enabled: z.boolean().default(true),
  severity: severitySchema,
  block: z.array(z.string()).optional(),
  allow: z.array(z.string()).optional(),
}).optional();

const commitMessageCheckSchema = z.object({
  enabled: z.boolean().default(true),
  severity: severitySchema,
  require_conventional: z.boolean().default(true),
}).optional();

const agentPatternsCheckSchema = z.object({
  enabled: z.boolean().default(true),
  severity: severitySchema,
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
  protected_branches: z.array(z.string()).optional(),
  notifications: z.object({
    slack_webhook: z.string().optional(),
    email: z.string().optional(),
  }).optional(),
  agent_feedback: z.object({
    enabled: z.boolean(),
    format: z.enum(["structured", "human-readable", "both"]),
  }).optional(),
});

export function validateConfig(data: unknown): PipelineConfig {
  const parsed = pipelineConfigSchema.parse(data);
  return parsed as PipelineConfig;
}
