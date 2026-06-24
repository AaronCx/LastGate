import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireSession, unauthorizedResponse } from "@/lib/auth";
import { accessibleRepoIds, canAccessRepo } from "@/lib/ownership";
import { isSafeWebhookUrl } from "@/lib/webhook-url";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (!session) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const repoId = searchParams.get("repo_id");

    // Scope to the caller's repos — GET previously returned every tenant's
    // configs, including their webhook_url secrets.
    const repoIds = await accessibleRepoIds(session);
    if (repoIds.length === 0) return NextResponse.json({ data: [] });

    let query = supabase
      .from("notification_configs")
      .select("*")
      .in("repo_id", repoIds)
      .order("created_at", { ascending: false });

    if (repoId) {
      query = query.eq("repo_id", repoId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching notification configs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (!session) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();
    const body = await request.json();

    const { repo_id, provider, webhook_url, notify_on, throttle_minutes, quiet_hours_start, quiet_hours_end, quiet_hours_timezone, mention_on_critical } = body;

    if (!repo_id || !provider || !webhook_url) {
      return NextResponse.json(
        { error: "repo_id, provider, and webhook_url are required" },
        { status: 400 }
      );
    }

    if (!["slack", "discord"].includes(provider)) {
      return NextResponse.json(
        { error: "provider must be 'slack' or 'discord'" },
        { status: 400 }
      );
    }

    // You can only attach a notification config to a repo you own.
    if (!(await canAccessRepo(session, repo_id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Reject SSRF-y webhook URLs at storage time (https + Slack/Discord hosts only).
    if (!isSafeWebhookUrl(webhook_url)) {
      return NextResponse.json(
        { error: "webhook_url must be an https Slack or Discord webhook URL" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("notification_configs")
      .insert({
        repo_id,
        provider,
        webhook_url,
        notify_on: notify_on || "fail_only",
        throttle_minutes: throttle_minutes || 5,
        quiet_hours_start: quiet_hours_start || null,
        quiet_hours_end: quiet_hours_end || null,
        quiet_hours_timezone: quiet_hours_timezone || "UTC",
        mention_on_critical: mention_on_critical || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Error creating notification config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (!session) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Only delete a config attached to a repo the caller owns.
    const repoIds = await accessibleRepoIds(session);
    const { data, error } = await supabase
      .from("notification_configs")
      .delete()
      .eq("id", id)
      .in("repo_id", repoIds.length > 0 ? repoIds : ["00000000-0000-0000-0000-000000000000"])
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting notification config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
