import type { PipelineConfig } from "../types";

export function getDefaultConfig(): PipelineConfig {
  return {
    checks: {
      secrets: {
        enabled: true,
        severity: "fail",
      },
      duplicates: {
        enabled: true,
        severity: "warn",
        lookback: 10,
      },
      lint: {
        enabled: true,
        severity: "fail",
      },
      build: {
        enabled: false,
        severity: "fail",
        timeout: 120,
      },
      dependencies: {
        enabled: true,
        severity: "warn",
        fail_on: "critical",
      },
      file_patterns: {
        enabled: true,
        severity: "fail",
      },
      commit_message: {
        enabled: true,
        severity: "warn",
        require_conventional: true,
      },
      agent_patterns: {
        enabled: true,
        severity: "warn",
      },
      semantic: {
        // Opt-in: the only check that calls an LLM. Off by default so existing users are never
        // surprised by token spend, and it fails open even when enabled-without-a-key.
        enabled: false,
        severity: "warn",
        token_budget: 20000,
        run_only_on_clean: true,
      },
    },
  };
}
