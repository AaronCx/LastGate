import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildSlackMessage, sendSlackNotification } from "@lastgate/engine/src/notifications/slack";
import { buildDiscordEmbed, sendDiscordNotification } from "@lastgate/engine/src/notifications/discord";
import type { NotificationPayload } from "@lastgate/engine/src/notifications/types";

export async function POST(request: NextRequest) {
  try {
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
