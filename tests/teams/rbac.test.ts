import { describe, test, expect } from "bun:test";
import { canPerform, isValidRole, getRoleLevel, canManageRole } from "../../apps/web/lib/permissions";
import type { Role, Action } from "../../apps/web/lib/permissions";

describe("RBAC Permissions", () => {
  test("viewer can only view", () => {
    expect(canPerform("viewer", "view")).toBe(true);
    expect(canPerform("viewer", "override_check")).toBe(false);
    expect(canPerform("viewer", "approve_pr")).toBe(false);
    expect(canPerform("viewer", "configure")).toBe(false);
    expect(canPerform("viewer", "manage_team")).toBe(false);
    expect(canPerform("viewer", "manage_billing")).toBe(false);
  });

  test("developer can view, override, and approve", () => {
    expect(canPerform("developer", "view")).toBe(true);
    expect(canPerform("developer", "override_check")).toBe(true);
    expect(canPerform("developer", "approve_pr")).toBe(true);
    expect(canPerform("developer", "configure")).toBe(false);
    expect(canPerform("developer", "manage_team")).toBe(false);
  });

  test("maintainer can configure", () => {
    expect(canPerform("maintainer", "view")).toBe(true);
    expect(canPerform("maintainer", "override_check")).toBe(true);
    expect(canPerform("maintainer", "configure")).toBe(true);
    expect(canPerform("maintainer", "manage_team")).toBe(false);
  });

  test("admin can manage team", () => {
    expect(canPerform("admin", "configure")).toBe(true);
    expect(canPerform("admin", "manage_team")).toBe(true);
    expect(canPerform("admin", "manage_billing")).toBe(false);
  });

  test("owner can do everything", () => {
    const actions: Action[] = ["view", "override_check", "approve_pr", "configure", "manage_team", "manage_billing"];
    for (const action of actions) {
      expect(canPerform("owner", action)).toBe(true);
    }
  });

  test("isValidRole validates known roles", () => {
    expect(isValidRole("viewer")).toBe(true);
    expect(isValidRole("developer")).toBe(true);
    expect(isValidRole("maintainer")).toBe(true);
    expect(isValidRole("admin")).toBe(true);
    expect(isValidRole("owner")).toBe(true);
    expect(isValidRole("superadmin")).toBe(false);
    expect(isValidRole("")).toBe(false);
  });

  test("role hierarchy is correct", () => {
    expect(getRoleLevel("viewer")).toBeLessThan(getRoleLevel("developer"));
    expect(getRoleLevel("developer")).toBeLessThan(getRoleLevel("maintainer"));
    expect(getRoleLevel("maintainer")).toBeLessThan(getRoleLevel("admin"));
    expect(getRoleLevel("admin")).toBeLessThan(getRoleLevel("owner"));
  });

  test("canManageRole enforces hierarchy", () => {
    expect(canManageRole("owner", "admin")).toBe(true);
    expect(canManageRole("admin", "developer")).toBe(true);
    expect(canManageRole("developer", "admin")).toBe(false);
    expect(canManageRole("admin", "admin")).toBe(false); // same level
    expect(canManageRole("viewer", "developer")).toBe(false);
  });
});
