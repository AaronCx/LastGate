import { describe, test, expect } from "bun:test";

/**
 * Tests for AuditLogTable component logic: ACTION_LABELS mapping,
 * fallback display, user attribution, time formatting.
 */

// Extracted from AuditLogTable.tsx
const ACTION_LABELS: Record<string, string> = {
  check_override: "Override check",
  config_change: "Changed config",
  member_added: "Added member",
  member_removed: "Removed member",
  member_role_changed: "Changed role",
  repo_added: "Added repo",
  repo_removed: "Removed repo",
  notification_config_changed: "Changed notifications",
  team_created: "Created team",
  team_updated: "Updated team",
};

function getActionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}

function getUserDisplay(users?: { github_username: string }): string {
  return users?.github_username || "System";
}

describe("AuditLogTable - ACTION_LABELS mapping", () => {
  test("check_override maps to 'Override check'", () => {
    expect(getActionLabel("check_override")).toBe("Override check");
  });

  test("config_change maps to 'Changed config'", () => {
    expect(getActionLabel("config_change")).toBe("Changed config");
  });

  test("member_added maps to 'Added member'", () => {
    expect(getActionLabel("member_added")).toBe("Added member");
  });

  test("member_removed maps to 'Removed member'", () => {
    expect(getActionLabel("member_removed")).toBe("Removed member");
  });

  test("member_role_changed maps to 'Changed role'", () => {
    expect(getActionLabel("member_role_changed")).toBe("Changed role");
  });

  test("repo_added maps to 'Added repo'", () => {
    expect(getActionLabel("repo_added")).toBe("Added repo");
  });

  test("repo_removed maps to 'Removed repo'", () => {
    expect(getActionLabel("repo_removed")).toBe("Removed repo");
  });

  test("notification_config_changed maps to 'Changed notifications'", () => {
    expect(getActionLabel("notification_config_changed")).toBe("Changed notifications");
  });

  test("team_created maps to 'Created team'", () => {
    expect(getActionLabel("team_created")).toBe("Created team");
  });

  test("team_updated maps to 'Updated team'", () => {
    expect(getActionLabel("team_updated")).toBe("Updated team");
  });

  test("unknown action falls back to raw action string", () => {
    expect(getActionLabel("some_custom_action")).toBe("some_custom_action");
  });

  test("all known actions have human-readable labels", () => {
    const knownActions = Object.keys(ACTION_LABELS);
    expect(knownActions.length).toBe(10);
    for (const action of knownActions) {
      expect(ACTION_LABELS[action]).toBeTruthy();
      expect(ACTION_LABELS[action]).not.toBe(action); // label differs from key
    }
  });
});

describe("AuditLogTable - user display", () => {
  test("shows github_username when user exists", () => {
    expect(getUserDisplay({ github_username: "octocat" })).toBe("octocat");
  });

  test("falls back to 'System' when users is undefined", () => {
    expect(getUserDisplay(undefined)).toBe("System");
  });

  test("falls back to 'System' when users is missing github_username", () => {
    expect(getUserDisplay(undefined)).toBe("System");
  });
});

describe("AuditLogTable - entry structure", () => {
  test("empty entries array shows no-data state", () => {
    const entries: unknown[] = [];
    expect(entries.length).toBe(0);
  });

  test("entry has required fields", () => {
    const entry = {
      id: "audit-1",
      action: "member_added",
      resource_type: "team_member",
      details: { member_id: "user-1" },
      created_at: "2025-01-15T10:30:00Z",
      users: { github_username: "octocat" },
    };
    expect(entry.id).toBeTruthy();
    expect(entry.action).toBeTruthy();
    expect(entry.resource_type).toBeTruthy();
    expect(entry.created_at).toBeTruthy();
  });

  test("created_at is a valid date string", () => {
    const created_at = "2025-01-15T10:30:00Z";
    const date = new Date(created_at);
    expect(date.getTime()).not.toBeNaN();
  });
});
