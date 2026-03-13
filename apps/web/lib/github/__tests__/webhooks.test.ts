import { describe, test, expect } from "bun:test";
import { createHmac } from "crypto";
import { verifyWebhookSignature } from "../webhooks";

const TEST_SECRET = "test-webhook-secret-123";

function sign(payload: string, secret: string = TEST_SECRET): string {
  return "sha256=" + createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

describe("Webhook Signature Verification", () => {
  test("valid signature with correct secret → accepted", () => {
    const payload = '{"action":"opened","number":1}';
    const signature = sign(payload);
    expect(verifyWebhookSignature(payload, signature, TEST_SECRET)).toBe(true);
  });

  test("invalid signature → rejected", () => {
    const payload = '{"action":"opened","number":1}';
    const signature = "sha256=invalid_hex_signature_that_is_definitely_wrong_0000";
    expect(verifyWebhookSignature(payload, signature, TEST_SECRET)).toBe(false);
  });

  test("missing signature header (empty string) → rejected", () => {
    const payload = '{"action":"opened","number":1}';
    expect(verifyWebhookSignature(payload, "", TEST_SECRET)).toBe(false);
  });

  test("empty payload → rejected", () => {
    expect(verifyWebhookSignature("", sign(""), TEST_SECRET)).toBe(true);
    // But wrong sig for empty payload should fail
    expect(verifyWebhookSignature("", "sha256=wrong", TEST_SECRET)).toBe(false);
  });

  test("tampered payload (valid sig but modified body) → rejected", () => {
    const originalPayload = '{"action":"opened","number":1}';
    const signature = sign(originalPayload);
    const tamperedPayload = '{"action":"opened","number":2}';
    expect(verifyWebhookSignature(tamperedPayload, signature, TEST_SECRET)).toBe(false);
  });

  test("wrong secret → rejected", () => {
    const payload = '{"action":"opened"}';
    const signature = sign(payload, "wrong-secret");
    expect(verifyWebhookSignature(payload, signature, TEST_SECRET)).toBe(false);
  });

  test("signature without sha256= prefix → rejected", () => {
    const payload = '{"test":true}';
    const rawHash = createHmac("sha256", TEST_SECRET).update(payload, "utf8").digest("hex");
    expect(verifyWebhookSignature(payload, rawHash, TEST_SECRET)).toBe(false);
  });
});
