import { describe, it, expect, beforeAll } from "bun:test";
import { GET, PUT } from "../settings/route";
import { createSession, SESSION_COOKIE } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const HAS_DB = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const ALICE = "11111111-1111-1111-1111-111111111111";

function req({ token, body }: { token?: string; body?: unknown } = {}): any {
  return {
    cookies: {
      get: (n: string) => (n === SESSION_COOKIE && token ? { value: token } : undefined),
    },
    json: async () => body ?? {},
    headers: new Headers(),
  };
}

describe.if(HAS_DB)("settings persistence (Global Rule Defaults)", () => {
  let alice = "";
  beforeAll(async () => {
    alice = await createSession(ALICE);
    await createServerSupabaseClient().from("user_settings").delete().eq("user_id", ALICE);
  });

  it("401 without a session", async () => {
    expect((await GET(req())).status).toBe(401);
  });

  it("GET returns sensible defaults when no row exists", async () => {
    const j = await (await GET(req({ token: alice }))).json();
    expect(j.defaults.secrets.enabled).toBe(true);
    expect(j.defaults.build.enabled).toBe(false); // build off by default
    expect(j.updated_at).toBeNull();
  });

  it("PUT persists, GET reflects it", async () => {
    const next = {
      secrets: { enabled: false },
      build: { enabled: true },
      duplicates: { enabled: true },
      lint: { enabled: true },
      dependencies: { enabled: true },
      agent_patterns: { enabled: true },
    };
    expect((await PUT(req({ token: alice, body: { defaults: next } }))).status).toBe(200);
    const j = await (await GET(req({ token: alice }))).json();
    expect(j.defaults.secrets.enabled).toBe(false);
    expect(j.defaults.build.enabled).toBe(true);
    expect(j.updated_at).not.toBeNull();
  });

  it("PUT sanitizes garbage input back to defaults (never corrupts)", async () => {
    expect((await PUT(req({ token: alice, body: { defaults: "not-an-object" } }))).status).toBe(200);
    const j = await (await GET(req({ token: alice }))).json();
    expect(j.defaults.secrets.enabled).toBe(true);
  });
});
