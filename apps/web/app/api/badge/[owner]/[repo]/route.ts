import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStatusFromRuns, getDetailedStatus } from "@lastgate/engine/src/badge/status";
import { generateBadgeSvg } from "@lastgate/engine/src/badge/svg";

export async function GET(
  request: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  try {
    const { owner, repo } = params;
    const fullName = `${owner}/${repo}`;
    const style = request.nextUrl.searchParams.get("style") || "simple";

    const supabase = createServerSupabaseClient();

    // Look up the repo
    const { data: repoData } = await supabase
      .from("repos")
      .select("id")
      .eq("full_name", fullName)
      .single();

    let runs: { status: string; created_at: string }[] = [];

    if (repoData) {
      const { data } = await supabase
        .from("check_runs")
        .select("status, created_at")
        .eq("repo_id", repoData.id)
        .order("created_at", { ascending: false })
        .limit(10);
      runs = data || [];
    }

    const status = style === "detailed"
      ? getDetailedStatus(runs)
      : getStatusFromRuns(runs);

    const svg = generateBadgeSvg({
      label: "LastGate",
      message: status.label,
      color: status.color,
    });

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Badge error:", error);
    const fallback = generateBadgeSvg({
      label: "LastGate",
      message: "error",
      color: "#9f9f9f",
    });
    return new NextResponse(fallback, {
      headers: { "Content-Type": "image/svg+xml" },
    });
  }
}
