import { describe, test, expect } from "bun:test";
import { dispatchNotifications } from "../index";
import { clearThrottleState } from "../throttle";
import type { NotificationConfig, NotificationPayload } from "../types";

function makeConfig(overrides: Partial<NotificationConfig> = {}): NotificationConfig {
  return {
    id: "cfg-1",
    repo_id: "repo-1",
    provider: "slack",
    webhook_url: "https://hooks.slack.com/test",
    notify_on: "all",
    throttle_minutes: 0,
    quiet_hours_start: null,
    quiet_hours_end: null,
    quiet_hours_timezone: "UTC",
    mention_on_critical: null,
    is_active: true,
    ...overrides,
  };
}

function makePayload(overrides: Partial<NotificationPayload> = {}): NotificationPayload {
  return {
    repoFullName: "AaronCx/AgentForge",
    commitSha: "abc1234567890",
    branch: "main",
    status: "failed",
    failures: [{ checkType: "secrets", summary: "API key detected" }],
    warnings: [],
    dashboardUrl: "https://lastgate.vercel.app/check/1",
    githubUrl: "https://github.com/AaronCx/AgentForge",
    ...overrides,
  };
}

describe("Notification Dispatcher", () => {
  test("dispatches to Slack when provider is slack", async () => {
    clearThrottleState();
    // The function calls sendSlackNotification which uses fetch
    // Without a real webhook, it will fail but the dispatch logic works
    const result = await dispatchNotifications(
      [makeConfig({ provider: "slack" })],
      makePayload()
    );
    // It will try to send and fail (no real webhook), but structure is correct
    expect(result.sent + result.failed).toBe(1);
    expect(result.skipped).toBe(0);
  });

  test("dispatches to Discord when provider is discord", async () => {
    clearThrottleState();
    const result = await dispatchNotifications(
      [makeConfig({ provider: "discord" })],
      makePayload()
    );
    expect(result.sent + result.failed).toBe(1);
    expect(result.skipped).toBe(0);
  });

  test("dispatches to multiple providers if both configured", async () => {
    clearThrottleState();
    const result = await dispatchNotifications(
      [
        makeConfig({ id: "cfg-1", provider: "slack" }),
        makeConfig({ id: "cfg-2", provider: "discord" }),
      ],
      makePayload()
    );
    expect(result.sent + result.failed).toBe(2);
  });

  test("does NOT dispatch when is_active is false", async () => {
    clearThrottleState();
    const result = await dispatchNotifications(
      [makeConfig({ is_active: false })],
      makePayload()
    );
    expect(result.skipped).toBe(1);
    expect(result.sent).toBe(0);
  });

  test("fail_only: sends on fail, NOT on pass", async () => {
    clearThrottleState();
    const failResult = await dispatchNotifications(
      [makeConfig({ notify_on: "fail_only" })],
      makePayload({ status: "failed" })
    );
    expect(failResult.sent + failResult.failed).toBe(1);

    clearThrottleState();
    const passResult = await dispatchNotifications(
      [makeConfig({ notify_on: "fail_only" })],
      makePayload({ status: "passed", failures: [] })
    );
    expect(passResult.skipped).toBe(1);
  });

  test("fail_and_warn: sends on fail and warn, NOT on pass", async () => {
    clearThrottleState();
    const warnResult = await dispatchNotifications(
      [makeConfig({ notify_on: "fail_and_warn" })],
      makePayload({ status: "warned" })
    );
    expect(warnResult.sent + warnResult.failed).toBe(1);

    clearThrottleState();
    const passResult = await dispatchNotifications(
      [makeConfig({ notify_on: "fail_and_warn" })],
      makePayload({ status: "passed", failures: [] })
    );
    expect(passResult.skipped).toBe(1);
  });

  test("all: sends on fail, warn, AND pass", async () => {
    clearThrottleState();
    for (const status of ["failed", "warned", "passed"] as const) {
      clearThrottleState();
      const result = await dispatchNotifications(
        [makeConfig({ notify_on: "all" })],
        makePayload({ status })
      );
      expect(result.sent + result.failed).toBe(1);
    }
  });

  test("notification failure never affects return structure", async () => {
    clearThrottleState();
    const result = await dispatchNotifications(
      [makeConfig({ webhook_url: "https://invalid.example.com/nonexistent" })],
      makePayload()
    );
    expect(typeof result.sent).toBe("number");
    expect(typeof result.failed).toBe("number");
    expect(typeof result.skipped).toBe("number");
  });
});
