import type { NotificationConfig, NotificationPayload } from "./types";
import { buildSlackMessage, sendSlackNotification } from "./slack";
import { buildDiscordEmbed, sendDiscordNotification } from "./discord";
import { shouldNotify, recordNotification } from "./throttle";

export type { NotificationConfig, NotificationPayload } from "./types";

export async function dispatchNotifications(
  configs: NotificationConfig[],
  payload: NotificationPayload
): Promise<{ sent: number; skipped: number; failed: number }> {
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const config of configs) {
    if (!shouldNotify(config, payload.status)) {
      skipped++;
      continue;
    }

    let success = false;

    if (config.provider === "slack") {
      const message = buildSlackMessage(payload, config.mention_on_critical);
      success = await sendSlackNotification(config.webhook_url, message);
    } else if (config.provider === "discord") {
      const message = buildDiscordEmbed(payload, config.mention_on_critical);
      success = await sendDiscordNotification(config.webhook_url, message);
    }

    if (success) {
      recordNotification(config);
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, skipped, failed };
}
