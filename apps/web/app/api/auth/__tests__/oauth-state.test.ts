import { describe, it, expect } from "bun:test";
import { POST } from "../github/route";

// The state check runs before the GitHub token exchange, so a bad/missing state
// returns 400 without any network call — no DB needed.
function req({ body, stateCookie }: { body: unknown; stateCookie?: string }): any {
  return {
    cookies: {
      get: (n: string) =>
        n === "lastgate_oauth_state" && stateCookie ? { value: stateCookie } : undefined,
    },
    json: async () => body,
    headers: new Headers(),
  };
}

describe("OAuth login CSRF: state must match the httpOnly cookie", () => {
  it("rejects when no state cookie was set", async () => {
    const r = await POST(req({ body: { code: "abc", state: "s1" } }));
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("Invalid OAuth state");
  });

  it("rejects a state that does not match the cookie", async () => {
    const r = await POST(req({ body: { code: "abc", state: "attacker" }, stateCookie: "real" }));
    expect(r.status).toBe(400);
  });

  it("rejects when the callback sends no state", async () => {
    const r = await POST(req({ body: { code: "abc" }, stateCookie: "real" }));
    expect(r.status).toBe(400);
  });
});
