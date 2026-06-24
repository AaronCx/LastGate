import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { accessibleRepoIdsForUser } from "@/lib/ownership";

export const dynamic = "force-dynamic";

/**
 * Bearer-authed check history for the CLI (`lastgate history`) and MCP tools.
 * The CLI/MCP authenticate with an API key, but /api/checks is cookie-only — so
 * `lastgate history` and two MCP tools always 401'd and read the wrong shape.
 * This endpoint validates the key (like /api/cli/check), scopes to the key
 * owner's repos, and returns the { entries } contract the clients expect.
 */
function mapStatus(s: string): "pass" | "fail" | "warn" {
  if (s === "passed") return "pass";
  if (s === "failed") return "fail";
  return "warn";
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
    }
    const apiKey = authHeader.slice(7);
    const supabase = createServerSupabaseClient();
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
    const keyPrefix = apiKey.slice(0, 12);

    const { data: keyRecord } = await supabase
      .from("api_keys")
      .select("id, user_id")
      .eq("key_hash", keyHash)
      .eq("key_prefix", keyPrefix)
      .single();

    if (!keyRecord) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10) || 10, 1), 100);
    const repoFilter = searchParams.get("repo");

    const repoIds = await accessibleRepoIdsForUser(keyRecord.user_id);
    if (repoIds.length === 0) return NextResponse.json({ entries: [] });

    let query = supabase
      .from("check_runs")
      .select("id, branch, status, commit_sha, commit_message, commit_author, total_checks, passed_checks, failed_checks, warned_checks, created_at, repos!inner(full_name)")
      .in("repo_id", repoIds)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (repoFilter) query = query.eq("repos.full_name", repoFilter);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const entries = (data ?? []).map((r: Record<string, unknown>) => {
      const repos = r.repos as { full_name?: string } | { full_name?: string }[] | null;
      const fullName = Array.isArray(repos) ? repos[0]?.full_name : repos?.full_name;
      return {
        id: r.id as string,
        repo: fullName || "",
        branch: (r.branch as string) || "",
        status: mapStatus(r.status as string),
        checksRun: (r.total_checks as number) || 0,
        checksPassed: (r.passed_checks as number) || 0,
        failures: (r.failed_checks as number) || 0,
        warnings: (r.warned_checks as number) || 0,
        timestamp: r.created_at as string,
        commitHash: (r.commit_sha as string) || "",
        commitMessage: (r.commit_message as string) || "",
        author: (r.commit_author as string) || "",
      };
    });

    // Update last_used_at for the key (best-effort).
    await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRecord.id);

    return NextResponse.json({ entries });
  } catch (err) {
    console.error("cli/checks error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
