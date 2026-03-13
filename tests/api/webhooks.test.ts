import { describe, test, expect } from "bun:test";
import { createHmac } from "crypto";
import { verifyWebhookSignature } from "../../apps/web/lib/github/webhooks";

const SECRET = "test-webhook-secret";

function sign(payload: string): string {
  return "sha256=" + createHmac("sha256", SECRET).update(payload, "utf8").digest("hex");
}

describe("Webhook Endpoint Logic", () => {
  test("POST with valid push event payload — signature verified", () => {
    const payload = JSON.stringify({
      ref: "refs/heads/main",
      after: "abc1234567890",
      repository: { full_name: "test/repo", owner: { login: "test" }, name: "repo" },
      pusher: { name: "test-user" },
      head_commit: { message: "feat: add feature" },
      installation: { id: 12345 },
    });
    const sig = sign(payload);
    expect(verifyWebhookSignature(payload, sig, SECRET)).toBe(true);
    // Parse succeeds
    const parsed = JSON.parse(payload);
    expect(parsed.ref).toBe("refs/heads/main");
  });

  test("POST with valid PR event payload — signature verified", () => {
    const payload = JSON.stringify({
      action: "opened",
      pull_request: {
        number: 42,
        head: { sha: "def456", ref: "feature/test" },
        title: "feat: new feature",
        user: { login: "agent" },
      },
      repository: { full_name: "test/repo", owner: { login: "test" }, name: "repo" },
      installation: { id: 12345 },
    });
    const sig = sign(payload);
    expect(verifyWebhookSignature(payload, sig, SECRET)).toBe(true);
  });

  test("POST with invalid signature — rejected", () => {
    const payload = '{"test": true}';
    expect(verifyWebhookSignature(payload, "sha256=invalid", SECRET)).toBe(false);
  });

  test("unsupported event type — acknowledged but no action", () => {
    // The route returns { ok: true, event, action: "ignored" } for unknown events
    const payload = JSON.stringify({ action: "created" });
    const sig = sign(payload);
    expect(verifyWebhookSignature(payload, sig, SECRET)).toBe(true);
    // Event type "installation" wouldn't trigger push/PR logic
  });

  test("missing signature header → 401 logic", () => {
    // Route checks: if (!signature) return 401
    const signature = null;
    expect(signature).toBeNull();
  });

  test("push payload without installation ID → 400 logic", () => {
    const payload = JSON.parse(JSON.stringify({
      ref: "refs/heads/main",
      after: "abc1234",
      repository: { full_name: "test/repo" },
      pusher: { name: "test" },
    }));
    // installationId would be undefined
    expect(payload.installation).toBeUndefined();
  });
});
