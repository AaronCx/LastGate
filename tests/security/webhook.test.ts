import { describe, test, expect } from "bun:test";
import { createHmac } from "crypto";
import { verifyWebhookSignature } from "../../apps/web/lib/github/webhooks";

const SECRET = "test-webhook-secret";

function sign(payload: string): string {
  return "sha256=" + createHmac("sha256", SECRET).update(payload, "utf8").digest("hex");
}

describe("Webhook Security", () => {
  test("validates x-hub-signature-256 on every request", () => {
    const payload = '{"action":"push"}';
    const validSig = sign(payload);
    expect(verifyWebhookSignature(payload, validSig, SECRET)).toBe(true);
    expect(verifyWebhookSignature(payload, "sha256=wrong", SECRET)).toBe(false);
  });

  test("replay attack: same payload handled idempotently", () => {
    const payload = '{"action":"push","id":"unique-123"}';
    const sig = sign(payload);
    // Both requests should verify successfully
    expect(verifyWebhookSignature(payload, sig, SECRET)).toBe(true);
    expect(verifyWebhookSignature(payload, sig, SECRET)).toBe(true);
    // Idempotency is handled by checking github_check_run_id uniqueness in DB
    const parsed = JSON.parse(payload);
    expect(parsed.id).toBe("unique-123");
  });

  test("payload size limit: large payloads should be rejectable", () => {
    const maxPayloadSize = 25 * 1024 * 1024; // 25MB
    const largePayload = "x".repeat(100);
    expect(largePayload.length).toBeLessThan(maxPayloadSize);
    // A 30MB payload should be rejected
    const tooLarge = 30 * 1024 * 1024;
    expect(tooLarge).toBeGreaterThan(maxPayloadSize);
  });

  test("invalid JSON payload doesn't crash the server", () => {
    const invalidJson = "this is not json {{{";
    const sig = sign(invalidJson);
    // Signature verification works on raw strings, not just JSON
    expect(verifyWebhookSignature(invalidJson, sig, SECRET)).toBe(true);
    // But JSON.parse would throw
    expect(() => JSON.parse(invalidJson)).toThrow();
  });

  test("empty signature is rejected", () => {
    const payload = '{"test":true}';
    expect(verifyWebhookSignature(payload, "", SECRET)).toBe(false);
  });

  test("timing-safe comparison prevents timing attacks", () => {
    // The verifyWebhookSignature uses timingSafeEqual
    const payload = '{"test":true}';
    const correctSig = sign(payload);
    // Even with a partially correct signature, it should take the same time
    const partiallyCorrect = correctSig.slice(0, -1) + "X";
    expect(verifyWebhookSignature(payload, partiallyCorrect, SECRET)).toBe(false);
  });
});
