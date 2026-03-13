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

    // Fetch agent check runs
    const { data: runs, error: runsError } = await supabase
      .from("check_runs")
      .select("id, repo_id, status, created_at, commit_author, is_agent_commit, total_checks, failed_checks")
      .gte("created_at", sinceISO)
      .order("created_at", { ascending: true });

    if (runsError) {
      return NextResponse.json({ error: runsError.message }, { status: 500 });
    }

    const agentRuns = (runs || []).filter((r) => r.is_agent_commit);
    const humanRuns = (runs || []).filter((r) => !r.is_agent_commit);

    // Agent reliability by author
    const authorMap = new Map<string, { total: number; passed: number; failed: number }>();
    for (const run of agentRuns) {
      const author = run.commit_author || "Unknown Agent";
      const entry = authorMap.get(author) || { total: 0, passed: 0, failed: 0 };
      entry.total++;
      if (run.status === "passed") entry.passed++;
      if (run.status === "failed") entry.failed++;
      authorMap.set(author, entry);
    }
    const agentReliability = Array.from(authorMap.entries())
      .map(([author, v]) => ({
        author,
        total: v.total,
        passed: v.passed,
        failed: v.failed,
        passRate: v.total > 0 ? Math.round((v.passed / v.total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Fetch check results for agent runs to find common mistakes
    const agentRunIds = agentRuns.map((r) => r.id);
    let agentResults: any[] = [];
    if (agentRunIds.length > 0) {
      const { data, error } = await supabase
        .from("check_results")
        .select("check_type, status, check_run_id")
        .in("check_run_id", agentRunIds)
        .eq("status", "fail");
      if (!error) agentResults = data || [];
    }

    // Common agent mistakes
    const mistakeMap = new Map<string, number>();
    for (const r of agentResults) {
      mistakeMap.set(r.check_type, (mistakeMap.get(r.check_type) || 0) + 1);
    }
    const commonMistakes = Array.from(mistakeMap.entries())
      .map(([checkType, count]) => ({
        checkType,
        count,
        percentage: agentRuns.length > 0
          ? Math.round((count / agentRuns.length) * 1000) / 10
          : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Session activity by hour of day
    const hourMap = new Map<number, number>();
    for (const run of agentRuns) {
      const hour = new Date(run.created_at).getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    }
    const sessionHeatmap = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      count: hourMap.get(h) || 0,
    }));

    // Summary comparison
    const summary = {
      agentTotal: agentRuns.length,
      agentPassRate: agentRuns.length > 0
        ? Math.round((agentRuns.filter((r) => r.status === "passed").length / agentRuns.length) * 1000) / 10
        : 0,
      humanTotal: humanRuns.length,
      humanPassRate: humanRuns.length > 0
        ? Math.round((humanRuns.filter((r) => r.status === "passed").length / humanRuns.length) * 1000) / 10
        : 0,
    };

    return NextResponse.json({
      range,
      summary,
      agentReliability,
      commonMistakes,
      sessionHeatmap,
    });
  } catch (error) {
    console.error("Agent analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
