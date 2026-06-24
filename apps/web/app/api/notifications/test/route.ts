import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireSession, unauthorizedResponse } from "@/lib/auth";
import { canAccessRepo } from "@/lib/ownership";
import { isSafeWebhookUrl } from "@/lib/webhook-url";
import { buildSlackMessage, sendSlackNotification } from "@lastgate/engine/src/notifications/slack";
import { buildDiscordEmbed, sendDiscordNotification } from "@lastgate/engine/src/notifications/discord";
import type { NotificationPayload } from "@lastgate/engine/src/notifications/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Was unauthenticated: anyone could load any config by id and make the
    // server POST to its stored webhook_url — a blind SSRF + reachability oracle.
    const session = await requireSession(request);
    if (!session) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { config_id } = body;

    if (!config_id) {
      return NextResponse.json({ error: "config_id is required" }, { status: 400 });
    }

    // Fetch the notification config
    const { data: config, error } = await supabase
      .from("notification_configs")
      .select("*")
      .eq("id", config_id)
      .single();

    if (error || !config) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 });
    }

    // You may only test a config attached to a repo you own.
    if (!config.repo_id || !(await canAccessRepo(session, config.repo_id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate the stored URL at send time too (defends against pre-existing
    // rows stored before storage-time validation existed).
    if (!isSafeWebhookUrl(config.webhook_url)) {
      return NextResponse.json(
        { error: "Stored webhook_url is not an allowed Slack/Discord https URL" },
        { status: 400 },
      );
    }

    // Build a test payload
    const testPayload: NotificationPayload = {
      repoFullName: "test/repo",
      commitSha: "abc1234567890",
      branch: "main",
      status: "failed",
      failures: [{ checkType: "secrets", summary: "Test notification — this is a test alert from LastGate" }],
      warnings: [],
      dashboardUrl: "https://lastgate.vercel.app",
      githubUrl: "https://github.com/test/repo",
    };

    let success = false;
    if (config.provider === "slack") {
      const message = buildSlackMessage(testPayload);
      success = await sendSlackNotification(config.webhook_url, message);
    } else if (config.provider === "discord") {
      const message = buildDiscordEmbed(testPayload);
      success = await sendDiscordNotification(config.webhook_url, message);
    }

    if (success) {
      return NextResponse.json({ success: true, message: "Test notification sent" });
    } else {
      return NextResponse.json({ error: "Failed to send test notification" }, { status: 502 });
    }
  } catch (error) {
    console.error("Error sending test notification:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
