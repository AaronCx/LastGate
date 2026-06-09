import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  teamIds: string[];
}

/**
 * Validates the `lastgate_session` cookie against the users table and loads
 * the caller's team memberships. Returns null when the session is absent or
 * invalid; API routes must respond 401 in that case.
 */
export async function requireSession(
  request: NextRequest
): Promise<SessionUser | null> {
  const sessionId = request.cookies.get("lastgate_session")?.value;
  if (!sessionId) return null;

  const supabase = createServerSupabaseClient();

  const { data: user, error } = await supabase
    .from("users")
    .select("id")
    .eq("id", sessionId)
    .single();

  if (error || !user) return null;

  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id);

  return {
    id: user.id,
    teamIds: (memberships ?? []).map((m) => m.team_id),
  };
}

/** Standard 401 response for routes guarded by requireSession. */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}
