import { describe, test, expect } from "bun:test";
import { withTimeout } from "../../packages/engine/src/sandbox/timeout";

describe("Custom Check Timeout", () => {
  test("resolves fast promises before timeout", async () => {
    const result = await withTimeout(Promise.resolve("ok"), 1000, "fast");
    expect(result).toBe("ok");
  });

  test("rejects slow promises after timeout", async () => {
    const slowPromise = new Promise((resolve) => setTimeout(resolve, 5000, "done"));
    try {
      await withTimeout(slowPromise, 50, "slow-check");
      expect(true).toBe(false); // should not reach
    } catch (err: any) {
      expect(err.message).toContain("timed out");
      expect(err.message).toContain("slow-check");
      expect(err.message).toContain("50ms");
    }
  });

  test("propagates rejections from the original promise", async () => {
    const failPromise = Promise.reject(new Error("check failed"));
    try {
      await withTimeout(failPromise, 1000, "fail-check");
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.message).toBe("check failed");
    }
  });

  test("timeout label is included in error message", async () => {
    const slowPromise = new Promise((resolve) => setTimeout(resolve, 5000));
    try {
      await withTimeout(slowPromise, 10, "my-custom-check");
    } catch (err: any) {
      expect(err.message).toContain("my-custom-check");
    }
  });
});
