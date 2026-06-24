import { describe, it, expect } from "bun:test";
import { rateLimit } from "../rate-limit";

const HAS_DB = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

describe.if(HAS_DB)("rate limiter (atomic Postgres fixed window)", () => {
  it("allows up to the limit, then blocks within the window", async () => {
    const bucket = `test:rl:${Date.now()}:${Math.round(Math.random() * 1e9)}`;
    const out: boolean[] = [];
    for (let i = 0; i < 5; i++) out.push(await rateLimit(bucket, 3, 60));
    expect(out.slice(0, 3).every(Boolean)).toBe(true); // first 3 allowed
    expect(out[3]).toBe(false); // 4th blocked
    expect(out[4]).toBe(false);
  });

  it("separate buckets don't interfere", async () => {
    const a = `test:rl:a:${Date.now()}`;
    const b = `test:rl:b:${Date.now()}`;
    expect(await rateLimit(a, 1, 60)).toBe(true);
    expect(await rateLimit(a, 1, 60)).toBe(false);
    expect(await rateLimit(b, 1, 60)).toBe(true); // independent bucket still allowed
  });
});
