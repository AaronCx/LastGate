import { describe, test, expect, beforeEach } from "bun:test";
import {
  shouldNotify,
  shouldThrottle,
  recordNotification,
  clearThrottleState,
} from "../../packages/engine/src/notifications/throttle";
import type { NotificationConfig } from "../../packages/engine/src/notifications/types";

const baseConfig: NotificationConfig = {
  id: "config-1",
  repo_id: "repo-1",
  provider: "slack",
  webhook_url: "https://hooks.slack.com/test",
  notify_on: "fail_only",
  throttle_minutes: 5,
  quiet_hours_start: null,
  quiet_hours_end: null,
  quiet_hours_timezone: "UTC",
  mention_on_critical: null,
  is_active: true,
};

describe("Notification Throttle", () => {
  beforeEach(() => {
    clearThrottleState();
  });

  test("first notification is not throttled", () => {
    expect(shouldThrottle(baseConfig)).toBe(false);
  });

  test("second notification within throttle window is throttled", () => {
    recordNotification(baseConfig);
    expect(shouldThrottle(baseConfig)).toBe(true);
  });

  test("shouldNotify returns true for failed status with fail_only config", () => {
    expect(shouldNotify(baseConfig, "failed")).toBe(true);
  });

  test("shouldNotify returns false for passed status with fail_only config", () => {
    expect(shouldNotify(baseConfig, "passed")).toBe(false);
  });

  test("shouldNotify returns false for warned status with fail_only config", () => {
    expect(shouldNotify(baseConfig, "warned")).toBe(false);
  });

  test("shouldNotify returns true for warned status with fail_and_warn config", () => {
    const config = { ...baseConfig, notify_on: "fail_and_warn" as const };
    expect(shouldNotify(config, "warned")).toBe(true);
  });

  test("shouldNotify returns false for passed status with fail_and_warn config", () => {
    const config = { ...baseConfig, notify_on: "fail_and_warn" as const };
    expect(shouldNotify(config, "passed")).toBe(false);
  });

  test("shouldNotify returns true for all statuses with 'all' config", () => {
    const config = { ...baseConfig, notify_on: "all" as const };
    expect(shouldNotify(config, "passed")).toBe(true);
    expect(shouldNotify(config, "warned")).toBe(true);
    expect(shouldNotify(config, "failed")).toBe(true);
  });

  test("shouldNotify returns false when inactive", () => {
    const config = { ...baseConfig, is_active: false };
    expect(shouldNotify(config, "failed")).toBe(false);
  });

  test("shouldNotify returns false when throttled", () => {
    recordNotification(baseConfig);
    expect(shouldNotify(baseConfig, "failed")).toBe(false);
  });

  test("different repos are throttled independently", () => {
    recordNotification(baseConfig);
    const otherConfig = { ...baseConfig, repo_id: "repo-2" };
    expect(shouldThrottle(otherConfig)).toBe(false);
  });
});
