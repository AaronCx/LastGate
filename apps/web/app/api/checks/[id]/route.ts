import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const cookieStore = cookies();
    const sessionId = cookieStore.get("lastgate_session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { action, comment } = body;

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    const validActions = ["approve", "request-changes", "send-back"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify the check run exists
    const { data: checkRun, error: checkRunError } = await supabase
      .from("check_runs")
      .select("id")
      .eq("id", params.id)
      .single();

    if (checkRunError || !checkRun) {
      return NextResponse.json({ error: "Check run not found" }, { status: 404 });
    }

    // Insert the review action
    const { error: insertError } = await supabase.from("review_actions").insert({
      check_run_id: params.id,
      user_id: sessionId,
      action,
      comment: comment || null,
    });

    if (insertError) {
      console.error("Review action insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to record review action" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Action "${action}" recorded successfully.`,
    });
  } catch (error) {
    console.error("Review action error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
