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
        enabled: true,
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
    },
  };
}
