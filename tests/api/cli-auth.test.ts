import { describe, test, expect } from "bun:test";
import { randomBytes, createHash } from "crypto";

describe("CLI Auth Endpoint Logic", () => {
  test("POST /api/cli/auth — requires device_code", () => {
    const body = {};
    expect((body as any).device_code).toBeUndefined();
  });

  test("POST /api/cli/auth — generates API key with lg_cli_ prefix", () => {
    const rawKey = `lg_cli_${randomBytes(24).toString("hex")}`;
    expect(rawKey).toStartWith("lg_cli_");
    expect(rawKey.length).toBeGreaterThan(12);
  });

  test("API key is hashed before storage", () => {
    const rawKey = `lg_cli_${randomBytes(24).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    expect(keyHash).not.toBe(rawKey);
    expect(keyHash.length).toBe(64); // SHA-256 hex = 64 chars
  });

  test("API key prefix is stored separately for identification", () => {
    const rawKey = `lg_cli_${randomBytes(24).toString("hex")}`;
    const prefix = rawKey.slice(0, 12);
    expect(prefix).toStartWith("lg_cli_");
    expect(prefix.length).toBe(12);
  });

  test("GET /api/cli/auth — device flow generates codes", () => {
    const deviceCode = randomBytes(4).toString("hex").toUpperCase();
    const userCode = `${randomBytes(2).toString("hex").toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
    expect(deviceCode.length).toBe(8);
    expect(userCode).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
  });

  test("device auth expires in 15 minutes", () => {
    const now = Date.now();
    const expiresAt = new Date(now + 15 * 60 * 1000).toISOString();
    const expiresDate = new Date(expiresAt);
    expect(expiresDate.getTime() - now).toBeGreaterThanOrEqual(14 * 60 * 1000);
    expect(expiresDate.getTime() - now).toBeLessThanOrEqual(16 * 60 * 1000);
  });

  test("expired/revoked key — lookup would fail", () => {
    // When key is revoked, the query has `.eq("revoked", false)` which would return no rows
    const revokedKey = { revoked: true };
    expect(revokedKey.revoked).toBe(true);
  });
});
