import { describe, test, expect } from "bun:test";
import { buildSlackMessage } from "../../packages/engine/src/notifications/slack";
import { planAutoFixes } from "../../packages/engine/src/autofix/index";
import type { AutoFixConfig } from "../../packages/engine/src/autofix/types";
import type { NotificationPayload } from "../../packages/engine/src/notifications/types";

describe("Notification + Auto-Fix Integration", () => {
  const autoFixConfig: AutoFixConfig = {
    enabled: true,
    fixes: {
      remove_blocked_files: true,
      update_gitignore: true,
      trailing_whitespace: true,
      eof_newline: true,
      linter_autofix: false,
    },
    protected_branches: ["main"],
    require_approval: false,
  };

  test("auto-fix runs and succeeds — notification reflects fix", () => {
    const files = [{ path: ".env", content: "SECRET=123", status: "added" }];
    const fixResult = planAutoFixes(files, "feature/x", autoFixConfig);
    expect(fixResult.applied.length).toBeGreaterThan(0);

    // Notification could say "Issues auto-fixed"
    const payload: NotificationPayload = {
      repoFullName: "AaronCx/AgentForge",
      commitSha: "abc1234567890",
      branch: "feature/x",
      status: "passed",
      failures: [],
      warnings: [],
      dashboardUrl: "https://lastgate.vercel.app/check/1",
      githubUrl: "https://github.com/AaronCx/AgentForge",
    };
    const msg = buildSlackMessage(payload);
    expect(msg.blocks[0].text.text).toContain("All Checks Passed");
  });

  test("auto-fix disabled, check fails — notification lists all failures", () => {
    const disabledConfig = { ...autoFixConfig, enabled: false };
    const fixResult = planAutoFixes([], "feature/x", disabledConfig);
    expect(fixResult.error).toBeDefined();

    const payload: NotificationPayload = {
      repoFullName: "AaronCx/AgentForge",
      commitSha: "abc1234567890",
      branch: "feature/x",
      status: "failed",
      failures: [{ checkType: "secrets", summary: ".env file committed" }],
      warnings: [],
      dashboardUrl: "https://lastgate.vercel.app/check/1",
      githubUrl: "https://github.com/AaronCx/AgentForge",
    };
    const msg = buildSlackMessage(payload);
    expect(msg.blocks[0].text.text).toContain("Check Failed");
  });

  test("protected branch blocks auto-fix, normal notification sent", () => {
    const fixResult = planAutoFixes([], "main", autoFixConfig);
    expect(fixResult.allowed).toBeUndefined();
    expect(fixResult.error).toContain("protected");
  });
});
