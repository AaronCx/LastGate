import { describe, it, expect, beforeAll } from "bun:test";
import { POST } from "../route";
import { createSession, SESSION_COOKIE } from "@/lib/auth";

const HAS_DB = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const HAS_LLM = !!(process.env.LASTGATE_LLM_BASE_URL || process.env.LASTGATE_LLM_API_KEY);
const ALICE = "11111111-1111-1111-1111-111111111111";
const RUN = "cccccccc-0000-0000-0000-0000000000f1"; // seeded failed run on alice's repo

function req(token?: string): any {
  return {
    cookies: {
      get: (n: string) => (n === SESSION_COOKIE && token ? { value: token } : undefined),
    },
    headers: new Headers(),
  };
}
const P = (id: string) => ({ params: Promise.resolve({ id }) });

describe.if(HAS_DB)("POST /api/checks/[id]/suggest", () => {
  let alice = "";
  beforeAll(async () => {
    alice = await createSession(ALICE);
  });

  it("401 without a session", async () => {
    expect((await POST(req(), P(RUN))).status).toBe(401);
  });

  it("404 for a run the caller can't access", async () => {
    const r = await POST(req(alice), P("00000000-0000-0000-0000-000000000000"));
    expect(r.status).toBe(404);
  });

  it("returns configured:false (graceful) when no LLM is configured", async () => {
    if (HAS_LLM) return; // only valid when the env has no LLM
    const r = await POST(req(alice), P(RUN));
    const j = await r.json();
    expect(j.configured).toBe(false);
    expect(j.suggestions).toEqual([]);
  });

  it("generates real fix suggestions via the configured LLM", async () => {
    if (!HAS_LLM) return; // local-only: run with LASTGATE_LLM_BASE_URL set (e.g. Ollama)
    const r = await POST(req(alice), P(RUN));
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.configured).toBe(true);
    expect(Array.isArray(j.suggestions)).toBe(true);
    expect(j.suggestions.length).toBeGreaterThan(0);
    expect(typeof j.suggestions[0].fix).toBe("string");
    expect(j.suggestions[0].fix.length).toBeGreaterThan(0);
  }, 90000);
});
