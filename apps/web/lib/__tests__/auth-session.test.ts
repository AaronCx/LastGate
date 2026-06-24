// Make the crypto tests self-contained: encryptSecret derives its key from a
// server secret, so give it a deterministic one (CI has none of those env vars).
process.env.LASTGATE_ENCRYPTION_KEY =
  process.env.LASTGATE_ENCRYPTION_KEY || "unit-test-encryption-key-deterministic";

import { describe, it, expect } from "bun:test";
import { requireSession, createSession, SESSION_COOKIE } from "../auth";
import {
  encryptSecret,
  decryptSecret,
  hashToken,
  generateSessionToken,
  safeEqual,
} from "../crypto";
import { createServerSupabaseClient } from "../supabase/server";

// Runs against the local Supabase stack (see supabase/ migrations + seed). Set
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to the local values when running:
//   eval "$(supabase status -o env | sed 's/^/export /')" && \
//   SUPABASE_URL=$API_URL SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY bun test lib/__tests__/auth-session.test.ts
const HAS_DB = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const ALICE = "11111111-1111-1111-1111-111111111111";
const ALICE_TEAM = "aaaaaaaa-0000-0000-0000-000000000001";

function reqWithCookie(token?: string): any {
  return {
    cookies: {
      get: (n: string) =>
        n === SESSION_COOKIE && token ? { value: token } : undefined,
    },
  };
}

describe("crypto helpers", () => {
  it("encrypt/decrypt round-trips and never embeds the plaintext", () => {
    const enc = encryptSecret("gho_supersecrettoken_1234567890");
    expect(enc).not.toContain("gho_supersecrettoken_1234567890");
    expect(enc.startsWith("v1:")).toBe(true);
    expect(decryptSecret(enc)).toBe("gho_supersecrettoken_1234567890");
  });

  it("hashToken is stable, deterministic, and not the token itself", () => {
    const t = generateSessionToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toBe(t);
    expect(hashToken(t).length).toBe(64); // sha256 hex
  });

  it("safeEqual compares constant-time without false positives", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe.if(HAS_DB)("session auth (C3): the cookie is an opaque token, not the user id", () => {
  it("rejects a forged cookie that is a real user UUID (the old account-takeover)", async () => {
    expect(await requireSession(reqWithCookie(ALICE))).toBeNull();
  });

  it("rejects a random/garbage cookie", async () => {
    expect(await requireSession(reqWithCookie("totally-made-up-token"))).toBeNull();
  });

  it("rejects a request with no session cookie", async () => {
    expect(await requireSession(reqWithCookie(undefined))).toBeNull();
  });

  it("accepts a freshly minted token and resolves the user + team memberships", async () => {
    const token = await createSession(ALICE);
    const s = await requireSession(reqWithCookie(token));
    expect(s?.id).toBe(ALICE);
    expect(s?.teamIds).toContain(ALICE_TEAM);
  });

  it("rejects an expired session", async () => {
    const token = generateSessionToken();
    const supabase = createServerSupabaseClient();
    await supabase.from("sessions").insert({
      user_id: ALICE,
      token_hash: hashToken(token),
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    expect(await requireSession(reqWithCookie(token))).toBeNull();
  });

  it("rejects a revoked session", async () => {
    const token = await createSession(ALICE);
    const supabase = createServerSupabaseClient();
    await supabase
      .from("sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", hashToken(token));
    expect(await requireSession(reqWithCookie(token))).toBeNull();
  });
});
