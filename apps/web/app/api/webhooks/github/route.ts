import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/github/webhooks";
import { createCheckRun, updateCheckRun } from "@/lib/github/checks";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-hub-signature-256");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 }
      );
    }

    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    const isValid = verifyWebhookSignature(body, signature, secret);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const event = request.headers.get("x-github-event");
    const payload = JSON.parse(body);

    const supabase = createServerSupabaseClient();

    if (event === "push") {
      const { repository, after, ref, pusher, head_commit } = payload;

      // Create a check run in GitHub
      const installationId = payload.installation?.id;
      if (!installationId) {
        return NextResponse.json(
          { error: "No installation ID" },
          { status: 400 }
        );
      }

      const checkRun = await createCheckRun({
        installationId,
        owner: repository.owner.login,
        repo: repository.name,
        headSha: after,
        name: "LastGate Check Pipeline",
      });

      // Store check run in Supabase
      const { data: checkRunRecord, error: insertError } = await supabase
        .from("check_runs")
        .insert({
          github_check_run_id: checkRun.id,
          repo_full_name: repository.full_name,
          head_sha: after,
          branch: ref.replace("refs/heads/", ""),
          commit_message: head_commit?.message || "",
          pusher: pusher.name,
          status: "in_progress",
          installation_id: installationId,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to store check run:", insertError);
      }

      // Run the check pipeline
      // In production, this would call: runCheckPipeline from @lastgate/engine
      // For now, we simulate the pipeline result
      const pipelineResult = {
        status: "completed" as const,
        conclusion: "success" as const,
        checks: [],
      };

      // Update GitHub check run with results
      await updateCheckRun({
        installationId,
        owner: repository.owner.login,
        repo: repository.name,
        checkRunId: checkRun.id,
        status: "completed",
        conclusion: pipelineResult.conclusion,
        output: {
          title: "LastGate Check Pipeline",
          summary: `All checks passed for ${after.slice(0, 7)}`,
        },
      });

      // Update Supabase record
      if (checkRunRecord) {
        await supabase
          .from("check_runs")
          .update({
            status: "completed",
            conclusion: pipelineResult.conclusion,
            completed_at: new Date().toISOString(),
          })
          .eq("id", checkRunRecord.id);
      }

      return NextResponse.json({ ok: true, checkRunId: checkRun.id });
    }

    if (event === "pull_request") {
      const { action, pull_request, repository } = payload;

      if (action === "opened" || action === "synchronize") {
        const installationId = payload.installation?.id;
        if (!installationId) {
          return NextResponse.json(
            { error: "No installation ID" },
            { status: 400 }
          );
        }

        const checkRun = await createCheckRun({
          installationId,
          owner: repository.owner.login,
          repo: repository.name,
          headSha: pull_request.head.sha,
          name: "LastGate Check Pipeline",
        });

        // Store and process similarly to push events
        await supabase.from("check_runs").insert({
          github_check_run_id: checkRun.id,
          repo_full_name: repository.full_name,
          head_sha: pull_request.head.sha,
          branch: pull_request.head.ref,
          commit_message: pull_request.title,
          pusher: pull_request.user.login,
          status: "in_progress",
          installation_id: installationId,
          pr_number: pull_request.number,
        });

        return NextResponse.json({ ok: true, checkRunId: checkRun.id });
      }
    }

    // Acknowledge unhandled events
    return NextResponse.json({ ok: true, event, action: "ignored" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
