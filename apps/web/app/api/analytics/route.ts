import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    const range = searchParams.get("range") || "7d";
    const daysBack = range === "90d" ? 90 : range === "30d" ? 30 : 7;
    const since = new Date();
    since.setDate(since.getDate() - daysBack);
    const sinceISO = since.toISOString();

    // Fetch check runs within the date range
    const { data: runs, error: runsError } = await supabase
      .from("check_runs")
      .select("id, repo_id, status, created_at, is_agent_commit, commit_author, total_checks, passed_checks, failed_checks, warned_checks")
      .gte("created_at", sinceISO)
      .order("created_at", { ascending: true });

    if (runsError) {
      return NextResponse.json({ error: runsError.message }, { status: 500 });
    }

    // Fetch check results for failure breakdown
    const runIds = (runs || []).map((r) => r.id);
    let results: any[] = [];
    if (runIds.length > 0) {
      const { data, error } = await supabase
        .from("check_results")
        .select("check_type, status, check_run_id")
        .in("check_run_id", runIds);
      if (!error) results = data || [];
    }

    // Aggregate: daily pass rate
    const dailyMap = new Map<string, { total: number; passed: number; failed: number; warned: number }>();
    for (const run of runs || []) {
      const day = run.created_at.slice(0, 10);
      const entry = dailyMap.get(day) || { total: 0, passed: 0, failed: 0, warned: 0 };
      entry.total++;
      if (run.status === "passed") entry.passed++;
      if (run.status === "failed") entry.failed++;
      if (run.status === "warned") entry.warned++;
      dailyMap.set(day, entry);
    }
    const dailyPassRate = Array.from(dailyMap.entries())
      .map(([day, v]) => ({
        day,
        total: v.total,
        passed: v.passed,
        failed: v.failed,
        warned: v.warned,
        passRate: v.total > 0 ? Math.round((v.passed / v.total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => a.day.localeCompare(b.day));

    // Aggregate: top failures by check_type
    const failureMap = new Map<string, number>();
    for (const r of results) {
      if (r.status === "fail") {
        failureMap.set(r.check_type, (failureMap.get(r.check_type) || 0) + 1);
      }
    }
    const topFailures = Array.from(failureMap.entries())
      .map(([checkType, count]) => ({ checkType, count }))
      .sort((a, b) => b.count - a.count);

    // Aggregate: overall stats
    const totalRuns = (runs || []).length;
    const passedRuns = (runs || []).filter((r) => r.status === "passed").length;
    const failedRuns = (runs || []).filter((r) => r.status === "failed").length;
    const warnedRuns = (runs || []).filter((r) => r.status === "warned").length;
    const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 1000) / 10 : 0;

    return NextResponse.json({
      range,
      summary: { totalRuns, passedRuns, failedRuns, warnedRuns, passRate },
      dailyPassRate,
      topFailures,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
