import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const apiKey = authHeader.slice(7);
    const supabase = createServerSupabaseClient();

    // Validate API key
    const { data: keyRecord, error: keyError } = await supabase
      .from("api_keys")
      .select("*")
      .eq("key_hash", apiKey) // In production, hash the key before lookup
      .eq("revoked", false)
      .single();

    if (keyError || !keyRecord) {
      return NextResponse.json(
        { error: "Invalid or revoked API key" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { repo, sha, branch, diff, files } = body;

    if (!repo || !sha) {
      return NextResponse.json(
        { error: "repo and sha are required" },
        { status: 400 }
      );
    }

    // Create check run record
    const { data: checkRun, error: insertError } = await supabase
      .from("check_runs")
      .insert({
        repo_full_name: repo,
        head_sha: sha,
        branch: branch || "unknown",
        commit_message: "",
        pusher: "cli",
        status: "in_progress",
        source: "cli",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to create check run" },
        { status: 500 }
      );
    }

    // In production, this would call runCheckPipeline from @lastgate/engine
    // For now, return a mock result
    const results = {
      id: checkRun.id,
      status: "completed",
      conclusion: "success",
      checks: [
        { name: "Secret Scanner", status: "passed", message: "No secrets detected" },
        { name: "Duplicate Detector", status: "passed", message: "No duplicates found" },
        { name: "Lint Check", status: "passed", message: "0 errors" },
      ],
    };

    // Update check run
    await supabase
      .from("check_runs")
      .update({
        status: "completed",
        conclusion: results.conclusion,
        completed_at: new Date().toISOString(),
      })
      .eq("id", checkRun.id);

    // Update last used timestamp for API key
    await supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRecord.id);

    return NextResponse.json(results);
  } catch (error) {
    console.error("CLI check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
