import { describe, it, expect, beforeAll } from "bun:test";
import { GET as reposGET, PATCH as reposPATCH } from "../repos/route";
import { GET as checksGET } from "../checks/route";
import { POST as notifPOST } from "../notifications/route";
import { GET as keysGET, DELETE as keysDELETE } from "../cli/auth/route";
import { GET as repoAnalyticsGET } from "../analytics/repos/[id]/route";
import { GET as agentAnalyticsGET } from "../analytics/agents/route";
import { createSession, SESSION_COOKIE } from "@/lib/auth";

// C2 cross-tenant IDOR — every list/mutation must scope to the caller. Invokes
// the real handlers against local Supabase with two seeded tenants.
const HAS_DB = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const ALICE = "11111111-1111-1111-1111-111111111111";
const BOB = "22222222-2222-2222-2222-222222222222";
const ALICE_REPO = "dddddddd-0000-0000-0000-000000000001";
const BOB_REPO = "dddddddd-0000-0000-0000-000000000002";
const BOB_KEY = "eeeeeeee-0000-0000-0000-0000000000b1";

function req({ token, body, url }: { token?: string; body?: unknown; url?: string } = {}): any {
  return {
    cookies: {
      get: (n: string) => (n === SESSION_COOKIE && token ? { value: token } : undefined),
    },
    json: async () => body ?? {},
    url: url ?? "http://localhost/api",
    headers: new Headers(),
  };
}

describe.if(HAS_DB)("C2: cross-tenant IDOR is closed", () => {
  let alice = "";
  beforeAll(async () => {
    alice = await createSession(ALICE);
  });

  it("repos GET returns only the caller's repos", async () => {
    const r = await reposGET(req({ token: alice }));
    const j = await r.json();
    const names = j.data.map((x: any) => x.full_name);
    expect(names).toContain("alice/secret-repo");
    expect(names).not.toContain("bob/secret-repo");
  });

  it("repos PATCH on another tenant's repo -> 404 (not 200)", async () => {
    const r = await reposPATCH(req({ token: alice, body: { id: BOB_REPO, is_active: false } }));
    expect(r.status).toBe(404);
  });

  it("repos PATCH on own repo -> 200", async () => {
    const r = await reposPATCH(req({ token: alice, body: { id: ALICE_REPO, is_active: true } }));
    expect(r.status).toBe(200);
  });

  it("checks GET excludes other tenants' check runs", async () => {
    const r = await checksGET(req({ token: alice }));
    const j = await r.json();
    const repoIds = j.data.map((x: any) => x.repo_id);
    expect(repoIds).toContain(ALICE_REPO);
    expect(repoIds).not.toContain(BOB_REPO);
  });

  it("notifications POST against another tenant's repo -> 403", async () => {
    const r = await notifPOST(
      req({ token: alice, body: { repo_id: BOB_REPO, provider: "slack", webhook_url: "https://hooks.slack.com/services/a/b/c" } }),
    );
    expect(r.status).toBe(403);
  });

  it("notifications POST rejects SSRF-y webhook URLs (metadata/loopback/http)", async () => {
    for (const url of [
      "http://169.254.169.254/latest/meta-data/",
      "https://localhost/x",
      "http://hooks.slack.com/services/a/b/c", // not https
      "https://evil.example.com/hook",
    ]) {
      const r = await notifPOST(req({ token: alice, body: { repo_id: ALICE_REPO, provider: "slack", webhook_url: url } }));
      expect(r.status).toBe(400);
    }
  });

  it("cli/auth GET returns only the caller's keys (not bob's)", async () => {
    const r = await keysGET(req({ token: alice }));
    const j = await r.json();
    const ids = (j.data || []).map((k: any) => k.id);
    expect(ids).not.toContain(BOB_KEY);
  });

  it("cli/auth DELETE on another tenant's key -> 404", async () => {
    const r = await keysDELETE(req({ token: alice, url: `http://localhost/api/cli/auth?id=${BOB_KEY}` }));
    expect(r.status).toBe(404);
  });

  it("analytics/repos/[id]: other tenant's repo -> 403, own -> 200", async () => {
    const bobR = await repoAnalyticsGET(req({ token: alice }), { params: Promise.resolve({ id: BOB_REPO }) });
    expect(bobR.status).toBe(403);
    const aliceR = await repoAnalyticsGET(req({ token: alice }), { params: Promise.resolve({ id: ALICE_REPO }) });
    expect(aliceR.status).toBe(200);
  });

  it("analytics/agents requires auth (was fully open)", async () => {
    expect((await agentAnalyticsGET(req())).status).toBe(401);
  });
});
