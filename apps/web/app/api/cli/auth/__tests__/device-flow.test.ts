import { describe, it, expect, beforeAll } from "bun:test";
import { POST } from "../route";
import { createSession, SESSION_COOKIE } from "@/lib/auth";

const HAS_DB = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const ALICE = "11111111-1111-1111-1111-111111111111";

function req({ body, token }: { body: unknown; token?: string }): any {
  return {
    json: async () => body,
    cookies: {
      get: (n: string) => (n === SESSION_COOKIE && token ? { value: token } : undefined),
    },
    headers: new Headers(),
  };
}

describe.if(HAS_DB)("CLI device flow", () => {
  let aliceToken = "";
  beforeAll(async () => {
    aliceToken = await createSession(ALICE);
  });

  it("start → (pending exchange 404) → authorize → exchange mints key → reuse 404", async () => {
    // 1. start (no auth)
    const startRes = await POST(req({ body: { action: "device_start" } }));
    expect(startRes.status).toBe(200);
    const { device_code, user_code, verification_uri } = await startRes.json();
    expect(device_code).toBeTruthy();
    expect(user_code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(verification_uri).toContain("/cli/authorize");

    // 2. exchange before authorize → 404 (still pending)
    expect((await POST(req({ body: { device_code } }))).status).toBe(404);

    // 3. authorize without a session → 401
    expect(
      (await POST(req({ body: { action: "device_authorize", user_code } }))).status,
    ).toBe(401);

    // 4. authorize with the logged-in user
    expect(
      (await POST(req({ body: { action: "device_authorize", user_code }, token: aliceToken }))).status,
    ).toBe(200);

    // 5. exchange now mints an API key
    const keyRes = await POST(req({ body: { device_code } }));
    expect(keyRes.status).toBe(200);
    expect((await keyRes.json()).api_key).toContain("lg_cli_");

    // 6. the device_code is single-use (consumed) → 404
    expect((await POST(req({ body: { device_code } }))).status).toBe(404);
  });

  it("authorize with an unknown user_code → 404", async () => {
    const r = await POST(
      req({ body: { action: "device_authorize", user_code: "ZZZZ-9999" }, token: aliceToken }),
    );
    expect(r.status).toBe(404);
  });
});
