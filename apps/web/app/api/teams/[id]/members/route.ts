import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireTeamPermission, isAuthError } from "@/lib/team-auth";
import { canManageRole, isValidRole, type Role } from "@/lib/permissions";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireTeamPermission(request, id, "view");
    if (isAuthError(auth)) return auth;

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("team_members")
      // Disambiguate the embed: team_members has two FKs to users (user_id and
      // invited_by), so an unqualified users(...) embed is ambiguous and 500s.
      .select("*, users:user_id(github_username, avatar_url, email)")
      .eq("team_id", id)
      .order("joined_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Only a member who can manage_team may add members.
    const auth = await requireTeamPermission(request, id, "manage_team");
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const { user_id, role } = body;

    if (!user_id || !role) {
      return NextResponse.json({ error: "user_id and role are required" }, { status: 400 });
    }
    if (!isValidRole(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    // Block privilege escalation: you cannot grant a role at or above your own.
    if (!canManageRole(auth.role, role as Role)) {
      return NextResponse.json(
        { error: "Cannot assign a role at or above your own" },
        { status: 403 },
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("team_members")
      // invited_by comes from the authenticated session, never the request body.
      .insert({ team_id: id, user_id, role, invited_by: auth.session.id })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditEvent(id, auth.session.id, "member_added", "team_member", user_id, { role });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
