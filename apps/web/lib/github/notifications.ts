import type { CheckRunResults } from "@lastgate/engine";
import { buildSlackMessage, sendSlackNotification } from "@lastgate/engine/src/notifications/slack";
import { buildDiscordEmbed, sendDiscordNotification } from "@lastgate/engine/src/notifications/discord";
import type {
  NotificationConfig,
  NotificationPayload,
} from "@lastgate/engine/src/notifications/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSafeWebhookUrl } from "@/lib/webhook-url";
import { rateLimit } from "@/lib/rate-limit";

export interface NotifyContext {
  repoFullName: string;
  commitSha: string;
  branch: string;
  /** Urgent (protected-branch direct-push failure) bypasses throttle + quiet hours. */
  urgent?: boolean;
}

/** True if `now` (in the config's tz) falls inside the quiet window. */
export function inQuietHours(
  start: string | null,
  end: string | null,
  tz: string,
  now: Date = new Date(),
): boolean {
  if (!start || !end) return false;
  const s = start.slice(0, 5);
  const e = end.slice(0, 5);
  if (s === e) return false; // start === end never suppresses (was ambiguous)
  let cur: string;
  try {
    cur = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz || "UTC",
    }).format(now);
  } catch {
    cur = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  }
  return s <= e ? cur >= s && cur < e : cur >= s || cur < e; // handles overnight windows
}

/**
 * Send the configured Slack/Discord notifications for a finished check run.
 * Previously this was a console.warn stub, so configured alerts NEVER fired.
 */
export async function dispatchNotification(
  repoId: string | null,
  results: CheckRunResults,
  context: NotifyContext,
): Promise<void> {
  if (!repoId) return;

  const supabase = createServerSupabaseClient();
  const { data: configs } = await supabase
    .from("notification_configs")
    .select("*")
    .eq("repo_id", repoId)
    .eq("is_active", true);
  if (!configs || configs.length === 0) return;

  const status: NotificationPayload["status"] = results.hasFailures
    ? "failed"
    : results.hasWarnings
      ? "warned"
      : "passed";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lastgate.vercel.app";
  const payload: NotificationPayload = {
    repoFullName: context.repoFullName,
    commitSha: context.commitSha,
    branch: context.branch,
    status,
    failures: results.checks
      .filter((c) => c.status === "fail")
      .map((c) => ({ checkType: c.type, summary: c.summary || c.title })),
    warnings: results.checks
      .filter((c) => c.status === "warn")
      .map((c) => ({ checkType: c.type, summary: c.summary || c.title })),
    dashboardUrl: appUrl,
    githubUrl: `https://github.com/${context.repoFullName}/commit/${context.commitSha}`,
  };

  for (const cfg of configs as NotificationConfig[]) {
    // notify_on filter
    if (cfg.notify_on === "fail_only" && status !== "failed") continue;
    if (cfg.notify_on === "fail_and_warn" && status === "passed") continue;

    if (!context.urgent) {
      if (inQuietHours(cfg.quiet_hours_start, cfg.quiet_hours_end, cfg.quiet_hours_timezone)) continue;
      // DB-backed throttle (atomic) — one send per throttle window per config.
      const allowed = await rateLimit(`notif:${cfg.id}`, 1, Math.max(1, cfg.throttle_minutes ?? 5) * 60);
      if (!allowed) continue;
    }

    if (!isSafeWebhookUrl(cfg.webhook_url)) continue;

    try {
      if (cfg.provider === "slack") {
        await sendSlackNotification(cfg.webhook_url, buildSlackMessage(payload, cfg.mention_on_critical));
      } else if (cfg.provider === "discord") {
        await sendDiscordNotification(cfg.webhook_url, buildDiscordEmbed(payload, cfg.mention_on_critical));
      }
    } catch (err) {
      console.error("Notification dispatch failed:", err);
    }
  }
}
