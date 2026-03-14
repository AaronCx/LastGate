import { describe, test, expect } from "bun:test";
import { withTimeout } from "../timeout";

describe("Sandbox Execution", () => {
  // Timeout
  test("check that completes quickly returns result normally", async () => {
    const result = await withTimeout(
      Promise.resolve("done"),
      5000,
      "fast-check"
    );
    expect(result).toBe("done");
  });

  test("check that exceeds timeout is killed with error", async () => {
    const slowPromise = new Promise((resolve) => setTimeout(resolve, 5000));
    try {
      await withTimeout(slowPromise, 50, "slow-check");
      expect(true).toBe(false); // should not reach here
    } catch (err: any) {
      expect(err.message).toContain("timed out");
      expect(err.message).toContain("slow-check");
    }
  });

  test("timeout error includes check name", async () => {
    const slowPromise = new Promise((resolve) => setTimeout(resolve, 5000));
    try {
      await withTimeout(slowPromise, 50, "my-custom-check");
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.message).toContain("my-custom-check");
      expect(err.message).toContain("50ms");
    }
  });

  test("rejection is propagated correctly", async () => {
    const failingPromise = Promise.reject(new Error("check crashed"));
    try {
      await withTimeout(failingPromise, 5000, "crash-check");
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.message).toBe("check crashed");
    }
  });

  // Crash handling
  test("check that throws an error is caught", async () => {
    const throwingPromise = (async () => {
      throw new Error("unexpected crash");
    })();
    try {
      await withTimeout(throwingPromise, 5000, "throw-check");
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.message).toBe("unexpected crash");
    }
  });

  test("resolved value is returned correctly", async () => {
    const result = await withTimeout(
      Promise.resolve({ status: "pass", title: "All good" }),
      1000,
      "value-check"
    );
    expect(result).toEqual({ status: "pass", title: "All good" });
  });
});
