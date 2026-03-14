import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { runCheckPipeline } from "@lastgate/engine";
import type { ChangedFile, CommitInfo } from "@lastgate/engine";
import crypto from "crypto";

export const dynamic = "force-dynamic";

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

    // Hash the key before lookup
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
    const keyPrefix = apiKey.slice(0, 8);

    const { data: keyRecord, error: keyError } = await supabase
      .from("api_keys")
      .select("*")
      .eq("key_hash", keyHash)
      .eq("key_prefix", keyPrefix)
      .single();

    if (keyError || !keyRecord) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { repo, sha, branch, files: rawFiles, commit_message, author } = body;

    if (!repo || !sha) {
      return NextResponse.json(
        { error: "repo and sha are required" },
        { status: 400 }
      );
    }

    // Find repo in database
    const { data: repoRecord } = await supabase
      .from("repos")
      .select("id, config")
      .eq("full_name", repo)
      .single();

    // Build changed files from CLI input
    const files: ChangedFile[] = (rawFiles || []).map(
      (f: Record<string, string>) => ({
        path: f.path || f.filename,
        content: f.content || f.patch || "",
        patch: f.patch || "",
        status: (f.status as ChangedFile["status"]) || "modified",
      })
    );

    const commits: CommitInfo[] = [
      {
        sha,
        message: commit_message || "",
        author: author || "cli",
        timestamp: new Date().toISOString(),
      },
    ];

    // Create check_runs record
    const { data: checkRunRecord } = await supabase
      .from("check_runs")
      .insert({
        repo_id: repoRecord?.id || null,
        commit_sha: sha,
        branch: branch || "unknown",
        trigger_event: "cli",
        status: "running",
        commit_message: commit_message || "",
        commit_author: author || "cli",
      })
      .select("id")
      .single();

    // Run the check pipeline
    const startTime = performance.now();
    const pipelineResult = await runCheckPipeline({
      files,
      commits,
      branch: branch || "unknown",
      repoFullName: repo,
      config: (repoRecord?.config as Record<string, unknown>) || {},
    });
    const duration = Math.round(performance.now() - startTime);

    // Store check results
    if (checkRunRecord) {
      const checkResults = pipelineResult.checks.map((check) => ({
        check_run_id: checkRunRecord.id,
        check_type: check.type,
        status: check.status,
        title: check.title,
        summary: check.summary || null,
        details: check.details || {},
        duration_ms: check.duration_ms || null,
      }));

      if (checkResults.length > 0) {
        await supabase.from("check_results").insert(checkResults);
      }

      const passed = pipelineResult.checks.filter(
        (c) => c.status === "pass"
      ).length;
      const failed = pipelineResult.checks.filter(
        (c) => c.status === "fail"
      ).length;
      const warned = pipelineResult.checks.filter(
        (c) => c.status === "warn"
      ).length;

      await supabase
        .from("check_runs")
        .update({
          status: pipelineResult.hasFailures
            ? "failed"
            : pipelineResult.hasWarnings
              ? "warned"
              : "passed",
          completed_at: new Date().toISOString(),
          total_checks: pipelineResult.checks.length,
          passed_checks: passed,
          failed_checks: failed,
          warned_checks: warned,
        })
        .eq("id", checkRunRecord.id);
    }

    // Update API key last used
    await supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRecord.id);

    return NextResponse.json({
      id: checkRunRecord?.id,
      status: "completed",
      conclusion: pipelineResult.hasFailures
        ? "failure"
        : pipelineResult.hasWarnings
          ? "warning"
          : "success",
      checks: pipelineResult.checks.map((c) => ({
        name: c.type,
        status: c.status,
        title: c.title,
        summary: c.summary,
      })),
      summary: pipelineResult.summary,
      duration,
    });
  } catch (error) {
    console.error("CLI check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
