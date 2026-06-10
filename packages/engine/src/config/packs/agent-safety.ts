import type { PolicyPack } from "./types";

/**
 * @lastgate/agent-safety — hardened defaults for repos where AI coding agents
 * open PRs. Strict secret scanning, agent-pattern detection promoted to a
 * failure, dangerous-file blocks, and semantic review enabled in warn mode to
 * catch intent-level regressions a regex can't.
 */
export const agentSafety: PolicyPack = {
  name: "@lastgate/agent-safety",
  version: 1,
  description:
    "Hardened defaults for repositories where AI coding agents open PRs: strict secrets, agent-pattern detection as a failure, dangerous-file blocks, and semantic review (warn).",
  config: {
    checks: {
      secrets: {
        enabled: true,
        severity: "fail",
        entropy_threshold: 4.2,
        entropy_severity: "high",
      },
      agent_patterns: {
        enabled: true,
        severity: "fail",
      },
      file_patterns: {
        enabled: true,
        severity: "fail",
        block: [
          "*.pem",
          "*.key",
          "*.p12",
          "*.pfx",
          "id_rsa",
          "id_ed25519",
          ".env",
          ".env.*",
          "*.sqlite",
          "*.db",
          "dump.sql",
        ],
        allow: [".env.example"],
      },
      dependencies: {
        enabled: true,
        severity: "fail",
        fail_on: "high",
      },
      commit_message: {
        enabled: true,
        severity: "warn",
        require_conventional: true,
      },
      semantic: {
        enabled: true,
        severity: "warn",
        token_budget: 20000,
        run_only_on_clean: true,
      },
    },
  },
};
