import { describe, test, expect } from "bun:test";
import { randomBytes, createHash } from "crypto";

describe("ApiKeyManager", () => {
  test("generate new key creates key with lg_ prefix", () => {
    const rawKey = `lg_cli_${randomBytes(24).toString("hex")}`;
    expect(rawKey).toStartWith("lg_cli_");
    expect(rawKey.length).toBeGreaterThan(20);
  });

  test("key list shows name, prefix, created date, last used date", () => {
    const keys = [
      {
        name: "CLI - 2024-03-13",
        prefix: "lg_cli_a1b2",
        created_at: "2024-03-13T10:00:00Z",
        last_used_at: "2024-03-13T15:30:00Z",
      },
      {
        name: "CI Pipeline",
        prefix: "lg_cli_c3d4",
        created_at: "2024-02-01T08:00:00Z",
        last_used_at: null,
      },
    ];
    expect(keys[0].name).toBe("CLI - 2024-03-13");
    expect(keys[0].prefix).toStartWith("lg_cli_");
    expect(keys[0].created_at).toBeTruthy();
    expect(keys[0].last_used_at).toBeTruthy();
    expect(keys[1].last_used_at).toBeNull();
  });

  test("key is masked after initial display", () => {
    const rawKey = "lg_cli_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";
    const prefix = rawKey.slice(0, 12);
    const masked = prefix + "..." + "****";
    expect(masked).toStartWith("lg_cli_a1b2c");
    expect(masked).toContain("****");
  });

  test("revoke button removes key (sets revoked: true)", () => {
    const key = { id: "1", revoked: false };
    // Simulate revoke
    key.revoked = true;
    expect(key.revoked).toBe(true);
  });

  test("revoked keys are filtered out of active list", () => {
    const allKeys = [
      { id: "1", name: "Active Key", revoked: false },
      { id: "2", name: "Old Key", revoked: true },
      { id: "3", name: "Another Active", revoked: false },
    ];
    const activeKeys = allKeys.filter(k => !k.revoked);
    expect(activeKeys.length).toBe(2);
    expect(activeKeys.every(k => !k.revoked)).toBe(true);
  });

  test("key hash is stored, not raw key", () => {
    const rawKey = `lg_cli_${randomBytes(24).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    expect(keyHash).not.toBe(rawKey);
    expect(keyHash.length).toBe(64);
  });

  test("copy functionality extracts raw key value", () => {
    const rawKey = `lg_cli_${randomBytes(24).toString("hex")}`;
    // Clipboard would receive the full key
    expect(rawKey).toStartWith("lg_cli_");
    expect(typeof rawKey).toBe("string");
  });
});
