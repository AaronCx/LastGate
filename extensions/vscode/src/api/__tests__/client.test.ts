import { describe, test, expect } from "bun:test";
import { LastGateClient } from "../client";

describe("VS Code API Client", () => {
  test("client initializes with API key and base URL", () => {
    const client = new LastGateClient("lg_test_key_12345678901234", "https://lastgate.vercel.app");
    expect(client).toBeDefined();
  });

  test("client uses default base URL if not specified", () => {
    const client = new LastGateClient("lg_test_key_12345678901234");
    expect(client).toBeDefined();
  });

  test("getRecentChecks is a function", () => {
    const client = new LastGateClient("lg_test_key_12345678901234");
    expect(typeof client.getRecentChecks).toBe("function");
  });

  test("getCheckDetails is a function", () => {
    const client = new LastGateClient("lg_test_key_12345678901234");
    expect(typeof client.getCheckDetails).toBe("function");
  });

  test("getRepoStatus is a function", () => {
    const client = new LastGateClient("lg_test_key_12345678901234");
    expect(typeof client.getRepoStatus).toBe("function");
  });
});
