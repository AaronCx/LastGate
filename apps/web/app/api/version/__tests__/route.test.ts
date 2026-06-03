import { describe, test, expect } from "bun:test";
import { GET } from "../route";
import { ENGINE_VERSION } from "@lastgate/engine";

describe("GET /api/version", () => {
  test("reports the engine version this deployment serves", async () => {
    const res = GET();
    const body = (await res.json()) as { name: string; engineVersion: string };
    expect(body.engineVersion).toBe(ENGINE_VERSION);
    expect(body.name).toBe("@lastgate/engine");
  });
});
