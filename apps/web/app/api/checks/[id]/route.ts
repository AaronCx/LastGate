import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();

    const { data: checkRun, error: checkRunError } = await supabase
      .from("check_runs")
      .select("*")
      .eq("id", params.id)
      .single();

    if (checkRunError || !checkRun) {
      return NextResponse.json(
        { error: "Check run not found" },
        { status: 404 }
      );
    }

    const { data: checkResults, error: resultsError } = await supabase
      .from("check_results")
      .select("*")
      .eq("check_run_id", params.id)
      .order("created_at", { ascending: true });

    if (resultsError) {
      return NextResponse.json(
        { error: resultsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...checkRun,
      results: checkResults || [],
    });
  } catch (error) {
    console.error("Error fetching check detail:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
