import { describe, it, expect, beforeAll } from "bun:test";
import { GET } from "../route";
import { createSession, SESSION_COOKIE } from "@/lib/auth";

const HAS_DB = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const ALICE = "11111111-1111-1111-1111-111111111111";
const RUN = "cccccccc-0000-0000-0000-0000000000f1"; // alice's run, seeded with a diff
const BOB_RUN = "cccccccc-0000-0000-0000-0000000000b1"; // bob's run

function req(token?: string): any {
  return {
    cookies: {
      get: (n: string) => (n === SESSION_COOKIE && token ? { value: token } : undefined),
    },
  };
}
const P = (id: string) => ({ params: Promise.resolve({ id }) });

describe.if(HAS_DB)("GET /api/checks/[id] (detail + stored diff, owner-scoped)", () => {
  let alice = "";
  beforeAll(async () => {
    alice = await createSession(ALICE);
  });

  it("401 without a session", async () => {
    expect((await GET(req(), P(RUN))).status).toBe(401);
  });

  it("returns the run, its results, and the stored diff for the owner", async () => {
    const r = await GET(req(alice), P(RUN));
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(Array.isArray(j.results)).toBe(true);
    expect(typeof j.diff).toBe("string");
    expect(j.diff).toContain("config.ts");
  });

  it("404 for another tenant's run (detail IDOR closed)", async () => {
    expect((await GET(req(alice), P(BOB_RUN))).status).toBe(404);
  });
});
