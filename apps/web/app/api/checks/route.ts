import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireSession, unauthorizedResponse } from "@/lib/auth";
import { accessibleRepoIds } from "@/lib/ownership";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (!session) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const repo = searchParams.get("repo");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Scope to the caller's repos — GET previously returned every tenant's
    // check history (commit shas, messages, authors, branches).
    const repoIds = await accessibleRepoIds(session);
    if (repoIds.length === 0) {
      return NextResponse.json({ data: [], pagination: { page, limit, total: 0, totalPages: 0 } });
    }

    let query = supabase
      .from("check_runs")
      // Explicit columns (NOT select *) so the large stored `diff` is never
      // shipped in list responses — only the per-run detail route returns it.
      .select(
        "id, repo_id, commit_sha, pr_number, branch, trigger_event, status, started_at, completed_at, total_checks, passed_checks, failed_checks, warned_checks, commit_message, commit_author, is_agent_commit, agent_session_id, created_at",
        { count: "exact" },
      )
      .in("repo_id", repoIds)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (repo) {
      // Look up the repo by full_name to get its UUID
      const { data: repoData } = await supabase
        .from("repos")
        .select("id")
        .eq("full_name", repo)
        .single();

      if (repoData) {
        query = query.eq("repo_id", repoData.id);
      } else {
        // No matching repo — return empty
        return NextResponse.json({
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (from) {
      query = query.gte("created_at", from);
    }

    if (to) {
      query = query.lte("created_at", to);
    }

    const { data, error, count } = await query;

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
    console.error("Error fetching checks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
