import type { PolicyPack } from "./types";

/**
 * @lastgate/solo-dev — lenient defaults for a solo developer or early
 * prototype. Nothing blocks except real secret leaks; everything else warns so
 * you stay informed without being gated. Build verification is off to keep the
 * loop fast.
 */
export const soloDev: PolicyPack = {
  name: "@lastgate/solo-dev",
  version: 1,
  description:
    "Lenient defaults for a solo dev or prototype: only real secret leaks block, everything else warns, build verification off.",
  config: {
    checks: {
      secrets: {
        enabled: true,
        severity: "fail",
        entropy_threshold: 5.0,
        entropy_severity: "medium",
      },
      duplicates: {
        enabled: true,
        severity: "warn",
        lookback: 10,
      },
      lint: {
        enabled: true,
        severity: "warn",
      },
      build: {
        enabled: false,
        severity: "warn",
        timeout: 120,
      },
      dependencies: {
        enabled: true,
        severity: "warn",
        fail_on: "critical",
      },
      file_patterns: {
        enabled: true,
        severity: "warn",
        block: ["*.sqlite", "*.pem", "*.key"],
      },
      commit_message: {
        enabled: false,
        severity: "warn",
        require_conventional: false,
      },
      agent_patterns: {
        enabled: true,
        severity: "warn",
      },
    },
  },
};
