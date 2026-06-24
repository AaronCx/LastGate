import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * Server-side crypto helpers for opaque session tokens and encrypting the
 * stored GitHub OAuth token at rest.
 *
 * The AES key is DERIVED (HKDF-SHA256) from an existing high-entropy server
 * secret, so encryption works in every environment that can already talk to
 * Supabase/GitHub — no new env var to forget, no prod login breakage on deploy.
 * Set LASTGATE_ENCRYPTION_KEY to override with a dedicated key.
 */
function encryptionKey(): Buffer {
  const explicit = process.env.LASTGATE_ENCRYPTION_KEY;
  if (explicit) return createHash("sha256").update(explicit).digest();
  const base =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.GITHUB_CLIENT_SECRET ||
    process.env.GITHUB_WEBHOOK_SECRET;
  if (!base) {
    throw new Error(
      "Cannot derive encryption key: set LASTGATE_ENCRYPTION_KEY or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return Buffer.from(
    hkdfSync("sha256", base, "lastgate-secret-salt", "lastgate-token-encryption", 32),
  );
}

/** A new opaque session token (256 bits, url-safe). Returned to the client once. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex of a token — what we persist; never store the raw token. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time string compare (for secrets / signatures). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** AES-256-GCM encrypt a secret for storage. Format: v1:iv:tag:ciphertext (base64url). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${enc.toString("base64url")}`;
}

/** Inverse of {@link encryptSecret}. Passes through legacy plaintext (no `v1:` prefix). */
export function decryptSecret(payload: string): string {
  if (!payload.startsWith("v1:")) return payload;
  const [, ivb, tagb, encb] = payload.split(":");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivb, "base64url"));
  decipher.setAuthTag(Buffer.from(tagb, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encb, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
