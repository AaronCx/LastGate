import { describe, test, expect } from "bun:test";
import { shouldThrottle, recordNotification, shouldNotify, clearThrottleState } from "../throttle";
import type { NotificationConfig } from "../types";

function makeConfig(overrides: Partial<NotificationConfig> = {}): NotificationConfig {
  return {
    id: "cfg-1",
    repo_id: "repo-1",
    provider: "slack",
    webhook_url: "https://hooks.slack.com/test",
    notify_on: "all",
    throttle_minutes: 5,
    quiet_hours_start: null,
    quiet_hours_end: null,
    quiet_hours_timezone: "UTC",
    mention_on_critical: null,
    is_active: true,
    ...overrides,
  };
}

describe("Throttle Logic", () => {
  test("first notification for a repo always sends (no prior record)", () => {
    clearThrottleState();
    expect(shouldThrottle(makeConfig())).toBe(false);
  });

  test("second notification within throttle_minutes window is suppressed", () => {
    clearThrottleState();
    const config = makeConfig({ throttle_minutes: 60 });
    recordNotification(config);
    expect(shouldThrottle(config)).toBe(true);
  });

  test("throttle is per-repo (repo A throttled, repo B still sends)", () => {
    clearThrottleState();
    const configA = makeConfig({ repo_id: "repo-A", throttle_minutes: 60 });
    const configB = makeConfig({ repo_id: "repo-B", throttle_minutes: 60 });
    recordNotification(configA);
    expect(shouldThrottle(configA)).toBe(true);
    expect(shouldThrottle(configB)).toBe(false);
  });

  test("throttle_minutes: 0 disables throttling", () => {
    clearThrottleState();
    const config = makeConfig({ throttle_minutes: 0 });
    recordNotification(config);
    // With 0 minutes, 0 * 60 * 1000 = 0, so Date.now() - lastTime should be >= 0 always
    // Actually the check is Date.now() - lastTime < throttleMs, and throttleMs = 0
    // so 0 < 0 is false, so shouldThrottle returns false
    expect(shouldThrottle(config)).toBe(false);
  });

  test("shouldNotify returns false when is_active is false", () => {
    clearThrottleState();
    expect(shouldNotify(makeConfig({ is_active: false }), "failed")).toBe(false);
  });

  test("shouldNotify returns false for fail_only on pass status", () => {
    clearThrottleState();
    expect(shouldNotify(makeConfig({ notify_on: "fail_only" }), "passed")).toBe(false);
  });

  test("shouldNotify returns true for fail_only on fail status", () => {
    clearThrottleState();
    expect(shouldNotify(makeConfig({ notify_on: "fail_only" }), "failed")).toBe(true);
  });

  test("shouldNotify returns false for fail_and_warn on pass status", () => {
    clearThrottleState();
    expect(shouldNotify(makeConfig({ notify_on: "fail_and_warn" }), "passed")).toBe(false);
  });

  test("shouldNotify returns true for fail_and_warn on warn status", () => {
    clearThrottleState();
    expect(shouldNotify(makeConfig({ notify_on: "fail_and_warn" }), "warned")).toBe(true);
  });

  test("shouldNotify returns true for all on pass status", () => {
    clearThrottleState();
    expect(shouldNotify(makeConfig({ notify_on: "all" }), "passed")).toBe(true);
  });

  test("throttle is independent per provider for same repo", () => {
    clearThrottleState();
    const slackConfig = makeConfig({ provider: "slack", throttle_minutes: 60 });
    const discordConfig = makeConfig({ provider: "discord", throttle_minutes: 60 });
    recordNotification(slackConfig);
    expect(shouldThrottle(slackConfig)).toBe(true);
    expect(shouldThrottle(discordConfig)).toBe(false);
  });
});
