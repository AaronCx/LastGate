import type { NotificationConfig } from "./types";

// In-memory throttle tracking (per-process)
const lastNotified = new Map<string, number>();

export function shouldThrottle(config: NotificationConfig): boolean {
  const key = `${config.repo_id}:${config.provider}`;
  const lastTime = lastNotified.get(key);

  if (!lastTime) return false;

  const throttleMs = config.throttle_minutes * 60 * 1000;
  return Date.now() - lastTime < throttleMs;
}

export function recordNotification(config: NotificationConfig): void {
  const key = `${config.repo_id}:${config.provider}`;
  lastNotified.set(key, Date.now());
}

export function isInQuietHours(config: NotificationConfig): boolean {
  if (!config.quiet_hours_start || !config.quiet_hours_end) return false;

  const now = new Date();
  // Convert to target timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: config.quiet_hours_timezone || "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const currentTime = formatter.format(now);

  const start = config.quiet_hours_start;
  const end = config.quiet_hours_end;

  // Handle overnight ranges (e.g., 22:00 to 08:00)
  if (start > end) {
    return currentTime >= start || currentTime < end;
  }

  return currentTime >= start && currentTime < end;
}

export function shouldNotify(
  config: NotificationConfig,
  status: "passed" | "failed" | "warned"
): boolean {
  if (!config.is_active) return false;

  // Check notification preference
  if (config.notify_on === "fail_only" && status !== "failed") return false;
  if (config.notify_on === "fail_and_warn" && status === "passed") return false;

  // Check throttle
  if (shouldThrottle(config)) return false;

  // Check quiet hours
  if (isInQuietHours(config)) return false;

  return true;
}

// For testing: clear throttle state
export function clearThrottleState(): void {
  lastNotified.clear();
}
