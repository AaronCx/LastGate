import type { SessionUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Tenant-scoping helpers. The web app talks to Supabase with the service-role
 * key, which BYPASSES the RLS policies in the migrations — so every list/mutation
 * must re-impose ownership in app code. A user can reach a repo it owns directly
 * (repos.user_id) or via a team it belongs to (repos.team_id).
 */

/** PostgREST `.or()` filter string for repos owned by the session. */
export function ownedRepoOrFilter(session: SessionUser): string {
  const parts = [`user_id.eq.${session.id}`];
  if (session.teamIds.length > 0) {
    parts.push(`team_id.in.(${session.teamIds.join(",")})`);
  }
  return parts.join(",");
}

/** Same, for an arbitrary user id + their team ids (used by the API-key CLI path). */
function ownedRepoOrFilterFor(userId: string, teamIds: string[]): string {
  const parts = [`user_id.eq.${userId}`];
  if (teamIds.length > 0) parts.push(`team_id.in.(${teamIds.join(",")})`);
  return parts.join(",");
}

/** IDs of every repo the session can access. */
export async function accessibleRepoIds(session: SessionUser): Promise<string[]> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("repos")
    .select("id")
    .or(ownedRepoOrFilter(session));
  return (data ?? []).map((r) => r.id as string);
}

/** True iff the session can access the given repo id. */
export async function canAccessRepo(session: SessionUser, repoId: string): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("repos")
    .select("id")
    .eq("id", repoId)
    .or(ownedRepoOrFilter(session))
    .maybeSingle();
  return !!data;
}

async function userTeamIds(userId: string): Promise<string[]> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId);
  return (data ?? []).map((r) => r.team_id as string);
}

/** True iff a specific user (not a web session) can access a repo — for the CLI key path. */
export async function repoAccessibleToUser(userId: string, repoId: string): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const teamIds = await userTeamIds(userId);
  const { data } = await supabase
    .from("repos")
    .select("id")
    .eq("id", repoId)
    .or(ownedRepoOrFilterFor(userId, teamIds))
    .maybeSingle();
  return !!data;
}

/** Every repo id a specific user can access (CLI key path). */
export async function accessibleRepoIdsForUser(userId: string): Promise<string[]> {
  const supabase = createServerSupabaseClient();
  const teamIds = await userTeamIds(userId);
  const { data } = await supabase
    .from("repos")
    .select("id")
    .or(ownedRepoOrFilterFor(userId, teamIds));
  return (data ?? []).map((r) => r.id as string);
}
