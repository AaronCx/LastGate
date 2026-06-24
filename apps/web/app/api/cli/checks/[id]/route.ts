import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { repoAccessibleToUser } from "@/lib/ownership";

export const dynamic = "force-dynamic";

/**
 * Bearer-authed single check-run details (incl. per-result findings) for the
 * VS Code extension's diagnostics. Mirrors /api/cli/check key auth; scoped to
 * the key owner's repos.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const { data: run } = await supabase
      .from("check_runs")
      .select("id, repo_id, status, commit_sha, branch, total_checks, passed_checks, failed_checks, created_at")
      .eq("id", id)
      .maybeSingle();
    if (!run || !(await repoAccessibleToUser(keyRecord.user_id, run.repo_id))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: results } = await supabase
      .from("check_results")
      .select("check_type, status, details")
      .eq("check_run_id", id);

    const findings: Array<{
      file: string;
      line?: number;
      message: string;
      checkType: string;
      status: "fail" | "warn";
    }> = [];
    for (const r of results ?? []) {
      if (r.status !== "fail" && r.status !== "warn") continue;
      const fs =
        ((r.details as Record<string, unknown>)?.findings as Array<Record<string, unknown>>) || [];
      for (const f of fs) {
        findings.push({
          file: (f.file as string) || "",
          line: f.line as number | undefined,
          message: (f.message as string) || (f.pattern as string) || `${r.check_type} issue`,
          checkType: r.check_type,
          status: r.status as "fail" | "warn",
        });
      }
    }

    return NextResponse.json({ run, findings });
  } catch (err) {
    console.error("cli/checks/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
