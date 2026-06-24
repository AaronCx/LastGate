import { describe, it, expect, beforeAll } from "bun:test";
import crypto from "crypto";
import { GET } from "../route";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const HAS_DB = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const ALICE = "11111111-1111-1111-1111-111111111111";
const RAW_KEY = "lg_cli_alicedetailskey0000000000000000";
const RUN = "cccccccc-0000-0000-0000-0000000000f1"; // seeded failed run + a finding on alice's repo
const BOB_RUN = "cccccccc-0000-0000-0000-0000000000b1"; // bob's run

function req(token?: string): any {
  return {
    headers: {
      get: (n: string) =>
        n.toLowerCase() === "authorization" && token ? `Bearer ${token}` : null,
    },
  };
}
const P = (id: string) => ({ params: Promise.resolve({ id }) });

describe.if(HAS_DB)("GET /api/cli/checks/[id] (bearer run details for the VS Code extension)", () => {
  beforeAll(async () => {
    const sb = createServerSupabaseClient();
    const prefix = RAW_KEY.slice(0, 12);
    await sb.from("api_keys").delete().eq("key_prefix", prefix);
    await sb.from("api_keys").insert({
      user_id: ALICE,
      name: "details key",
      key_hash: crypto.createHash("sha256").update(RAW_KEY).digest("hex"),
      key_prefix: prefix,
    });
  });

  it("401 without a bearer token", async () => {
    expect((await GET(req(), P(RUN))).status).toBe(401);
  });

  it("returns the run + findings for the key owner's run", async () => {
    const r = await GET(req(RAW_KEY), P(RUN));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.run.id).toBe(RUN);
    expect(Array.isArray(body.findings)).toBe(true);
    expect(body.findings.length).toBeGreaterThan(0);
    expect(body.findings[0]).toHaveProperty("checkType");
    expect(body.findings[0]).toHaveProperty("file");
  });

  it("404 for another tenant's run", async () => {
    expect((await GET(req(RAW_KEY), P(BOB_RUN))).status).toBe(404);
  });
});
