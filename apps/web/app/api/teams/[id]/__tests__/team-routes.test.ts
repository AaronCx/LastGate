import { describe, it, expect, beforeAll } from "bun:test";
import { GET as membersGET, POST as membersPOST } from "../members/route";
import { GET as auditGET } from "../audit/route";
import { createSession, SESSION_COOKIE } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Real integration tests against local Supabase: they invoke the ACTUAL route
// handlers (not a re-implemented mirror) and assert the authz outcome.
const HAS_DB = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const ALICE = "11111111-1111-1111-1111-111111111111"; // owner of ALICE_TEAM
const BOB = "22222222-2222-2222-2222-222222222222"; // not a member
const ALICE_TEAM = "aaaaaaaa-0000-0000-0000-000000000001";

function req({ token, body }: { token?: string; body?: unknown } = {}): any {
  return {
    cookies: {
      get: (n: string) => (n === SESSION_COOKIE && token ? { value: token } : undefined),
    },
    json: async () => body ?? {},
    url: "http://localhost/api/teams/x",
    headers: new Headers(),
  };
}
const P = () => ({ params: Promise.resolve({ id: ALICE_TEAM }) });

describe.if(HAS_DB)("C4: team routes require auth + RBAC (were fully unauthenticated)", () => {
  let aliceToken = "";
  let bobToken = "";

  beforeAll(async () => {
    aliceToken = await createSession(ALICE);
    bobToken = await createSession(BOB);
    const sb = createServerSupabaseClient();
    await sb.from("team_members").delete().eq("team_id", ALICE_TEAM).eq("user_id", BOB);
  });

  it("members GET: anonymous -> 401", async () => {
    expect((await membersGET(req(), P())).status).toBe(401);
  });
  it("members GET: non-member (bob) -> 403", async () => {
    expect((await membersGET(req({ token: bobToken }), P())).status).toBe(403);
  });
  it("members GET: member (alice) -> 200", async () => {
    expect((await membersGET(req({ token: aliceToken }), P())).status).toBe(200);
  });

  it("members POST: anonymous can NO LONGER self-add as owner -> 401", async () => {
    const r = await membersPOST(req({ body: { user_id: BOB, role: "owner" } }), P());
    expect(r.status).toBe(401);
  });
  it("members POST: non-member -> 403", async () => {
    const r = await membersPOST(req({ token: bobToken, body: { user_id: BOB, role: "developer" } }), P());
    expect(r.status).toBe(403);
  });
  it("members POST: owner cannot grant a role at/above own (no escalation) -> 403", async () => {
    const r = await membersPOST(req({ token: aliceToken, body: { user_id: BOB, role: "owner" } }), P());
    expect(r.status).toBe(403);
  });
  it("members POST: owner adds a developer -> 201, invited_by from session not body", async () => {
    const r = await membersPOST(
      req({ token: aliceToken, body: { user_id: BOB, role: "developer", invited_by: BOB } }),
      P(),
    );
    expect(r.status).toBe(201);
    const j = await r.json();
    expect(j.data.invited_by).toBe(ALICE); // not the spoofed BOB from the body
    const sb = createServerSupabaseClient();
    await sb.from("team_members").delete().eq("team_id", ALICE_TEAM).eq("user_id", BOB);
  });

  it("audit GET: anonymous -> 401, non-member -> 403, owner -> 200", async () => {
    expect((await auditGET(req(), P())).status).toBe(401);
    expect((await auditGET(req({ token: bobToken }), P())).status).toBe(403);
    expect((await auditGET(req({ token: aliceToken }), P())).status).toBe(200);
  });
});
