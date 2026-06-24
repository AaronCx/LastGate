import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireSession, unauthorizedResponse, type SessionUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canPerform, isValidRole, type Action, type Role } from "@/lib/permissions";

export interface TeamAuth {
  session: SessionUser;
  role: Role;
}

/** The caller's role in a team, or null if they aren't a member. */
export async function getTeamRole(
  session: SessionUser,
  teamId: string,
): Promise<Role | null> {
  if (!session.teamIds.includes(teamId)) return null;
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", session.id)
    .maybeSingle();
  return data && isValidRole(data.role) ? (data.role as Role) : null;
}

/**
 * Gate a team route. Requires a valid session, membership in the team, and the
 * given permission. Returns the {session, role} context on success, or a
 * NextResponse (401/403) the caller should return directly. The RBAC module was
 * fully implemented but never enforced anywhere — this is the missing wiring.
 */
export async function requireTeamPermission(
  request: NextRequest,
  teamId: string,
  action: Action,
): Promise<TeamAuth | NextResponse> {
  const session = await requireSession(request);
  if (!session) return unauthorizedResponse();
  const role = await getTeamRole(session, teamId);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!canPerform(role, action)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { session, role };
}

/** Type guard so route handlers can early-return the gate's error response. */
export function isAuthError(v: TeamAuth | NextResponse): v is NextResponse {
  return v instanceof NextResponse;
}
