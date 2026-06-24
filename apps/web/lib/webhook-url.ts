/**
 * Validate a notification webhook URL before storing it OR sending to it.
 * Prevents SSRF: the stored URL is fetched server-side, so it must be limited to
 * https on the known provider hosts and can never point at internal/loopback/
 * link-local/metadata addresses.
 */

const ALLOWED_HOSTS = [
  "hooks.slack.com",
  "discord.com",
  "discordapp.com",
  "ptb.discord.com",
  "canary.discord.com",
];

export class WebhookUrlError extends Error {}

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  // IPv4 literal ranges (loopback, private, link-local/metadata, CGNAT, 0.0.0.0).
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  }
  // IPv6 loopback / unique-local / link-local (with or without brackets).
  const v6 = h.replace(/^\[|\]$/g, "");
  if (v6 === "::1") return true;
  if (v6.startsWith("fc") || v6.startsWith("fd")) return true; // ULA
  if (v6.startsWith("fe80")) return true; // link-local
  return false;
}

export function isSafeWebhookUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  const hostAllowed = ALLOWED_HOSTS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
  if (!hostAllowed) return false;
  if (isPrivateHost(host)) return false;
  return true;
}

/** Throw a WebhookUrlError if the URL isn't a safe provider webhook URL. */
export function assertSafeWebhookUrl(raw: string): void {
  if (!isSafeWebhookUrl(raw)) {
    throw new WebhookUrlError(
      "webhook_url must be an https URL on an allowed provider host (Slack or Discord)",
    );
  }
}
