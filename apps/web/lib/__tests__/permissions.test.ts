import { describe, test, expect } from "bun:test";
import { canPerform, isValidRole, getRoleLevel, canManageRole } from "../permissions";
import type { Role, Action } from "../permissions";

describe("Permission Middleware", () => {
  // Role → Action mapping (exhaustive)
  test("Viewer: can view, cannot do anything else", () => {
    expect(canPerform("viewer", "view")).toBe(true);
    expect(canPerform("viewer", "override_check")).toBe(false);
    expect(canPerform("viewer", "approve_pr")).toBe(false);
    expect(canPerform("viewer", "configure")).toBe(false);
    expect(canPerform("viewer", "manage_team")).toBe(false);
    expect(canPerform("viewer", "manage_billing")).toBe(false);
  });

  test("Developer: can view, override_check, approve_pr", () => {
    expect(canPerform("developer", "view")).toBe(true);
    expect(canPerform("developer", "override_check")).toBe(true);
    expect(canPerform("developer", "approve_pr")).toBe(true);
    expect(canPerform("developer", "configure")).toBe(false);
    expect(canPerform("developer", "manage_team")).toBe(false);
    expect(canPerform("developer", "manage_billing")).toBe(false);
  });

  test("Maintainer: can view, override_check, approve_pr, configure", () => {
    expect(canPerform("maintainer", "view")).toBe(true);
    expect(canPerform("maintainer", "override_check")).toBe(true);
    expect(canPerform("maintainer", "approve_pr")).toBe(true);
    expect(canPerform("maintainer", "configure")).toBe(true);
    expect(canPerform("maintainer", "manage_team")).toBe(false);
    expect(canPerform("maintainer", "manage_billing")).toBe(false);
  });

  test("Admin: can do everything except manage_billing", () => {
    expect(canPerform("admin", "view")).toBe(true);
    expect(canPerform("admin", "override_check")).toBe(true);
    expect(canPerform("admin", "approve_pr")).toBe(true);
    expect(canPerform("admin", "configure")).toBe(true);
    expect(canPerform("admin", "manage_team")).toBe(true);
    expect(canPerform("admin", "manage_billing")).toBe(false);
  });

  test("Owner: can do everything", () => {
    expect(canPerform("owner", "view")).toBe(true);
    expect(canPerform("owner", "override_check")).toBe(true);
    expect(canPerform("owner", "approve_pr")).toBe(true);
    expect(canPerform("owner", "configure")).toBe(true);
    expect(canPerform("owner", "manage_team")).toBe(true);
    expect(canPerform("owner", "manage_billing")).toBe(true);
  });

  // Edge cases
  test("unknown role string returns false for all actions", () => {
    expect(canPerform("unknown" as Role, "view")).toBe(false);
    expect(canPerform("unknown" as Role, "configure")).toBe(false);
  });

  test("isValidRole identifies valid roles", () => {
    expect(isValidRole("viewer")).toBe(true);
    expect(isValidRole("developer")).toBe(true);
    expect(isValidRole("maintainer")).toBe(true);
    expect(isValidRole("admin")).toBe(true);
    expect(isValidRole("owner")).toBe(true);
  });

  test("isValidRole rejects invalid roles", () => {
    expect(isValidRole("superadmin")).toBe(false);
    expect(isValidRole("")).toBe(false);
    expect(isValidRole("root")).toBe(false);
  });

  // Hierarchy
  test("role levels increase from viewer to owner", () => {
    expect(getRoleLevel("viewer")).toBeLessThan(getRoleLevel("developer"));
    expect(getRoleLevel("developer")).toBeLessThan(getRoleLevel("maintainer"));
    expect(getRoleLevel("maintainer")).toBeLessThan(getRoleLevel("admin"));
    expect(getRoleLevel("admin")).toBeLessThan(getRoleLevel("owner"));
  });

  test("canManageRole: higher role can manage lower", () => {
    expect(canManageRole("owner", "admin")).toBe(true);
    expect(canManageRole("admin", "maintainer")).toBe(true);
    expect(canManageRole("admin", "developer")).toBe(true);
  });

  test("canManageRole: cannot manage same or higher role", () => {
    expect(canManageRole("admin", "admin")).toBe(false);
    expect(canManageRole("admin", "owner")).toBe(false);
    expect(canManageRole("developer", "maintainer")).toBe(false);
  });

  test("Admin cannot promote someone to Owner", () => {
    expect(canManageRole("admin", "owner")).toBe(false);
  });
});
