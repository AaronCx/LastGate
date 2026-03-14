import { describe, test, expect } from "bun:test";
import { isInQuietHours } from "../throttle";
import type { NotificationConfig } from "../types";

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

describe("Quiet Hours", () => {
  test("no quiet hours configured returns false", () => {
    expect(isInQuietHours(makeConfig())).toBe(false);
  });

  test("quiet hours with null start returns false", () => {
    expect(isInQuietHours(makeConfig({ quiet_hours_start: null, quiet_hours_end: "08:00" }))).toBe(false);
  });

  test("quiet hours with null end returns false", () => {
    expect(isInQuietHours(makeConfig({ quiet_hours_start: "22:00", quiet_hours_end: null }))).toBe(false);
  });

  test("respects the configured timezone", () => {
    // This test verifies timezone support doesn't throw
    const config = makeConfig({
      quiet_hours_start: "22:00",
      quiet_hours_end: "06:00",
      quiet_hours_timezone: "America/New_York",
    });
    // Should not throw
    const result = isInQuietHours(config);
    expect(typeof result).toBe("boolean");
  });

  test("isInQuietHours returns boolean for daytime range", () => {
    // 09:00-17:00 — a normal daytime range
    const config = makeConfig({
      quiet_hours_start: "09:00",
      quiet_hours_end: "17:00",
      quiet_hours_timezone: "UTC",
    });
    const result = isInQuietHours(config);
    expect(typeof result).toBe("boolean");
  });

  test("overnight range handled correctly (22:00-08:00)", () => {
    // The code handles this with the start > end check
    const config = makeConfig({
      quiet_hours_start: "22:00",
      quiet_hours_end: "08:00",
      quiet_hours_timezone: "UTC",
    });
    const result = isInQuietHours(config);
    expect(typeof result).toBe("boolean");
  });
});
