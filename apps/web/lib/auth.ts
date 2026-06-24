import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateSessionToken, hashToken } from "@/lib/crypto";

export const SESSION_COOKIE = "lastgate_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export interface SessionUser {
  id: string;
  teamIds: string[];
}

/**
 * Validates the `lastgate_session` cookie and loads the caller's team
 * memberships. The cookie holds an opaque random token (NOT the user id); we
 * look the session up by the token's hash and enforce expiry + revocation.
 * Returns null when the session is absent, expired, revoked, or unknown — API
 * routes must respond 401 in that case.
 */
export async function requireSession(
  request: NextRequest
): Promise<SessionUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const supabase = createServerSupabaseClient();

  const { data: session, error } = await supabase
    .from("sessions")
    .select("user_id, expires_at, revoked_at")
    .eq("token_hash", hashToken(token))
    .single();

  if (error || !session) return null;
  if (session.revoked_at) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) return null;

  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", session.user_id);

  return {
    id: session.user_id,
    teamIds: (memberships ?? []).map((m) => m.team_id),
  };
}

/**
 * Create a session row for a user and return the RAW token to set as the cookie.
 * Only the token's hash is persisted, so a DB read can never reconstruct a
 * working cookie.
 */
export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("sessions").insert({
    user_id: userId,
    token_hash: hashToken(token),
    expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  });
  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return token;
}

/** Cookie options for the session cookie (set both at login and on logout-clear). */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    path: "/",
  };
}

/** Revoke the caller's session server-side (real logout-everywhere for that token). */
export async function revokeSession(request: NextRequest): Promise<void> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return;
  const supabase = createServerSupabaseClient();
  await supabase
    .from("sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", hashToken(token));
}

/** Standard 401 response for routes guarded by requireSession. */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}
