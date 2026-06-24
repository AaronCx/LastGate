import { describe, it, expect, beforeAll } from "bun:test";
import crypto from "crypto";
import { GET } from "../route";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const HAS_DB = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const ALICE = "11111111-1111-1111-1111-111111111111";
const RAW_KEY = "lg_cli_alicetestkey000000000000000000";

function req(token?: string): any {
  return {
    headers: {
      get: (n: string) =>
        n.toLowerCase() === "authorization" && token ? `Bearer ${token}` : null,
    },
    url: "http://localhost/api/cli/checks?limit=10",
  };
}

describe.if(HAS_DB)("GET /api/cli/checks (bearer-authed history for CLI + MCP)", () => {
  beforeAll(async () => {
    const sb = createServerSupabaseClient();
    const prefix = RAW_KEY.slice(0, 12);
    const hash = crypto.createHash("sha256").update(RAW_KEY).digest("hex");
    await sb.from("api_keys").delete().eq("key_prefix", prefix);
    await sb.from("api_keys").insert({
      user_id: ALICE,
      name: "test cli key",
      key_hash: hash,
      key_prefix: prefix,
    });
  });

  it("401 without a bearer token", async () => {
    expect((await GET(req())).status).toBe(401);
  });

  it("401 with an invalid key", async () => {
    expect((await GET(req("lg_cli_doesnotexist0000"))).status).toBe(401);
  });

  it("returns the { entries } shape scoped to the key owner's repos", async () => {
    const r = await GET(req(RAW_KEY));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(Array.isArray(body.entries)).toBe(true);
    const repos = body.entries.map((e: any) => e.repo);
    expect(repos).toContain("alice/secret-repo");
    expect(repos).not.toContain("bob/secret-repo"); // cross-tenant excluded
    // shape the CLI/MCP consume
    const e = body.entries.find((x: any) => x.repo === "alice/secret-repo");
    expect(["pass", "fail", "warn"]).toContain(e.status);
    expect(typeof e.commitHash).toBe("string");
  });
});
