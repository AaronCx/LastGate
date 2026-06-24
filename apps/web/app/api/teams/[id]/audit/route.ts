import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireTeamPermission, isAuthError } from "@/lib/team-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // The audit log is sensitive (overrides, approvals, config/member changes) —
    // require a team member with manage_team.
    const auth = await requireTeamPermission(request, id, "manage_team");
    if (isAuthError(auth)) return auth;

    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const { data, error, count } = await supabase
      .from("audit_log")
      .select("*, users(github_username)", { count: "exact" })
      .eq("team_id", id)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
