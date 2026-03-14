import { describe, test, expect } from "bun:test";
import { canPerform, canManageRole } from "../../apps/web/lib/permissions";
import { shouldNotify, clearThrottleState } from "../../packages/engine/src/notifications/throttle";
import type { NotificationConfig } from "../../packages/engine/src/notifications/types";

describe("Teams + Notifications Integration", () => {
  test("viewer can see notification configs (view permission)", () => {
    expect(canPerform("viewer", "view")).toBe(true);
  });

  test("viewer cannot add notification configs (configure permission)", () => {
    expect(canPerform("viewer", "configure")).toBe(false);
  });

  test("maintainer can manage notification configs", () => {
    expect(canPerform("maintainer", "configure")).toBe(true);
  });

  test("admin can manage team and notification configs", () => {
    expect(canPerform("admin", "manage_team")).toBe(true);
    expect(canPerform("admin", "configure")).toBe(true);
  });

  test("notification config respects active state", () => {
    clearThrottleState();
    const config: NotificationConfig = {
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
      is_active: false,
    };
    expect(shouldNotify(config, "failed")).toBe(false);
  });

  test("role hierarchy enforced for notification management", () => {
    expect(canManageRole("admin", "developer")).toBe(true);
    expect(canManageRole("developer", "admin")).toBe(false);
  });
});
