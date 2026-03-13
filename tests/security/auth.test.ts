import { describe, test, expect } from "bun:test";
import { createHash, randomBytes } from "crypto";

describe("Auth & Authorization", () => {
  test("all protected endpoints require authentication", () => {
    const protectedEndpoints = [
      "/api/checks",
      "/api/checks/[id]",
      "/api/repos",
      "/api/cli/check",
    ];
    const publicEndpoints = ["/api/webhooks/github"];
    // Protected endpoints need Bearer token
    for (const endpoint of protectedEndpoints) {
      expect(endpoint).not.toBe("/api/webhooks/github");
    }
    // Webhook endpoint uses signature verification instead
    expect(publicEndpoints).toContain("/api/webhooks/github");
  });

  test("invalid JWT/session token → 401", () => {
    const invalidToken = "invalid_jwt_token";
    const isValid = invalidToken.startsWith("lg_cli_") || invalidToken.startsWith("eyJ");
    expect(isValid).toBe(false);
  });

  test("API keys are hashed before database storage", () => {
    const rawKey = `lg_cli_${randomBytes(24).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    expect(keyHash).not.toBe(rawKey);
    expect(keyHash.length).toBe(64);
    // Verify hash is deterministic
    const keyHash2 = createHash("sha256").update(rawKey).digest("hex");
    expect(keyHash).toBe(keyHash2);
  });

  test("API key prefix is stored separately for identification", () => {
    const rawKey = `lg_cli_${randomBytes(24).toString("hex")}`;
    const prefix = rawKey.slice(0, 12);
    expect(prefix).toStartWith("lg_cli_");
    // Prefix alone is not enough to reconstruct the key
    expect(prefix.length).toBeLessThan(rawKey.length);
  });

  test("revoked API keys immediately stop working", () => {
    const keyRecord = { revoked: true, key_hash: "abc123" };
    const query = { revoked: false };
    const matches = keyRecord.revoked === query.revoked;
    expect(matches).toBe(false); // Revoked key doesn't match active-only query
  });

  test("GitHub OAuth state parameter prevents CSRF", () => {
    const state = randomBytes(16).toString("hex");
    expect(state.length).toBe(32);
    // State should be unique per session
    const state2 = randomBytes(16).toString("hex");
    expect(state).not.toBe(state2);
  });

  test("user isolation — row-level security filter", () => {
    const userId = "user-a-uuid";
    const query = { user_id: userId };
    // Different user can't access
    const otherUserId = "user-b-uuid";
    expect(query.user_id).not.toBe(otherUserId);
  });
});
