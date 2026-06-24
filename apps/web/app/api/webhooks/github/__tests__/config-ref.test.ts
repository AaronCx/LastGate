import { describe, it, expect } from "bun:test";
import { gateConfigRef } from "../route";

// C1: the gate config must come from the base (target) branch on a PR, so a PR
// can't ship a permissive .lastgate.yml to disable the gate against itself.
describe("C1-web: gateConfigRef", () => {
  it("pull_request -> base.sha, NEVER the attacker-controlled head.sha", () => {
    const payload = {
      action: "opened",
      pull_request: {
        head: { sha: "HEAD_ATTACKER_SHA", ref: "feature" },
        base: { sha: "BASE_TRUSTED_SHA", ref: "main" },
      },
    };
    expect(gateConfigRef("pull_request", payload as any)).toBe("BASE_TRUSTED_SHA");
  });

  it("pull_request falls back to base.ref when base.sha is absent", () => {
    const payload = { pull_request: { head: { sha: "H" }, base: { ref: "main" } } };
    expect(gateConfigRef("pull_request", payload as any)).toBe("main");
  });

  it("push -> the pushed commit (the branch that is landing)", () => {
    expect(gateConfigRef("push", { after: "PUSH_SHA" } as any)).toBe("PUSH_SHA");
  });
});
