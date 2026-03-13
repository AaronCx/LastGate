import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify GitHub webhook signature using HMAC SHA-256.
 * Uses crypto.timingSafeEqual to prevent timing attacks.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature =
      "sha256=" +
      createHmac("sha256", secret).update(payload, "utf8").digest("hex");

    const sigBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
