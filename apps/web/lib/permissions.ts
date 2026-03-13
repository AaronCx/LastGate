export type Role = "viewer" | "developer" | "maintainer" | "admin" | "owner";
export type Action = "view" | "override_check" | "approve_pr" | "configure" | "manage_team" | "manage_billing";

const ROLE_PERMISSIONS: Record<Role, Action[]> = {
  viewer: ["view"],
  developer: ["view", "override_check", "approve_pr"],
  maintainer: ["view", "override_check", "approve_pr", "configure"],
  admin: ["view", "override_check", "approve_pr", "configure", "manage_team"],
  owner: ["view", "override_check", "approve_pr", "configure", "manage_team", "manage_billing"],
};

const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 0,
  developer: 1,
  maintainer: 2,
  admin: 3,
  owner: 4,
};

export function canPerform(role: Role, action: Action): boolean {
  return ROLE_PERMISSIONS[role]?.includes(action) ?? false;
}

export function isValidRole(role: string): role is Role {
  return role in ROLE_PERMISSIONS;
}

export function getRoleLevel(role: Role): number {
  return ROLE_HIERARCHY[role] ?? 0;
}

export function canManageRole(managerRole: Role, targetRole: Role): boolean {
  return getRoleLevel(managerRole) > getRoleLevel(targetRole);
}
