import { describe, test, expect, beforeEach } from "bun:test";
import { checkSemantic, type SemanticReviewCall } from "../semantic";
import type { ChangedFile, CheckResult, SemanticCheckConfig } from "../../types";
import { clearSemanticCache } from "../../ai/cache";

const baseConfig: SemanticCheckConfig = {
  enabled: true,
  severity: "warn",
  token_budget: 20000,
  run_only_on_clean: true,
};

function file(path: string, content: string): ChangedFile {
  return { path, content, status: "added" };
}

/** A fake LLM that returns a fixed finding and counts how many times it was invoked. */
function fakeReviewer(text: string): { call: SemanticReviewCall; calls: () => number } {
  let n = 0;
  const call: SemanticReviewCall = async () => {
    n += 1;
    return { text, promptTokens: 100, completionTokens: 20 };
  };
  return { call, calls: () => n };
}

const FINDING_JSON = JSON.stringify([
  { file: "src/auth.ts", line: 2, rule: "weakened-auth", severity: "high", message: "Auth check removed" },
]);

beforeEach(() => {
  clearSemanticCache();
});

describe("Semantic Review tier", () => {
  test("returns warn-severity findings from a mocked LLM", async () => {
    const { call } = fakeReviewer(FINDING_JSON);
    const files = [file("src/auth.ts", "function login() {\n  return true;\n}")];

    const result = await checkSemantic(files, baseConfig, { reviewCall: call });

    expect(result.type).toBe("semantic");
    // High-severity finding but severity:"warn" config → capped at warn, never block.
    expect(result.status).toBe("warn");
    const findings = (result.details as any).findings;
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe("weakened-auth");
    expect(findings[0].severity).toBe("high");
  });

  test("passes with no findings when the LLM reports an empty array", async () => {
    const { call } = fakeReviewer("[]");
    const files = [file("src/index.ts", "const x = 1;")];

    const result = await checkSemantic(files, baseConfig, { reviewCall: call });

    expect(result.status).toBe("pass");
    expect((result.details as any).count).toBe(0);
  });

  test("caches results by diff hash — identical diff does not call the LLM twice", async () => {
    const { call, calls } = fakeReviewer(FINDING_JSON);
    const files = [file("src/auth.ts", "function login() {\n  return true;\n}")];

    const first = await checkSemantic(files, baseConfig, { reviewCall: call });
    const second = await checkSemantic(files, baseConfig, { reviewCall: call });

    expect(calls()).toBe(1);
    expect((second.details as any).cached).toBe(true);
    expect((first.details as any).findings).toEqual((second.details as any).findings);
  });

  test("cache key changes when the policy changes — different policy re-calls the LLM", async () => {
    const { call, calls } = fakeReviewer(FINDING_JSON);
    const files = [file("src/auth.ts", "function login() {\n  return true;\n}")];

    await checkSemantic(files, baseConfig, { reviewCall: call });
    await checkSemantic(files, { ...baseConfig, policy: "Flag any new SQL." }, { reviewCall: call });

    expect(calls()).toBe(2);
  });

  test("fails OPEN when no LLM client is configured (pass + skipped note)", async () => {
    const files = [file("src/auth.ts", "function login() { return true; }")];

    const result = await checkSemantic(files, baseConfig, {});

    expect(result.status).toBe("pass");
    expect((result.details as any).skipped).toBe(true);
    expect((result.details as any).reason).toContain("no LLM client configured");
  });

  test("fails OPEN when the LLM throws (pass + skipped note)", async () => {
    const throwingCall: SemanticReviewCall = async () => {
      throw new Error("rate limited");
    };
    const files = [file("src/auth.ts", "function login() { return true; }")];

    const result = await checkSemantic(files, baseConfig, { reviewCall: throwingCall });

    expect(result.status).toBe("pass");
    expect((result.details as any).skipped).toBe(true);
    expect((result.details as any).reason).toContain("rate limited");
  });

  test("respects the token budget cap — skips the call when the diff is too large", async () => {
    const { call, calls } = fakeReviewer(FINDING_JSON);
    // A huge added line easily exceeds a tiny budget.
    const files = [file("src/big.ts", "x".repeat(10000))];

    const result = await checkSemantic(
      files,
      { ...baseConfig, token_budget: 50 },
      { reviewCall: call },
    );

    expect(result.status).toBe("pass");
    expect((result.details as any).skipped).toBe(true);
    expect((result.details as any).reason).toContain("token_budget");
    expect(calls()).toBe(0);
  });

  test("disabled-by-config is enforced at the pipeline layer; the check itself reviews when invoked", async () => {
    // The check is only invoked when enabled (pipeline gate). When config marks it disabled but the
    // check is still called directly, it does not crash — it reviews normally. The opt-in gate is
    // covered by the pipeline; here we assert the standalone check is robust.
    const { call } = fakeReviewer("[]");
    const files = [file("src/index.ts", "const x = 1;")];
    const result = await checkSemantic(files, { ...baseConfig, enabled: false }, { reviewCall: call });
    expect(result.type).toBe("semantic");
  });

  test("run_only_on_clean short-circuits when a prior static tier failed", async () => {
    const { call, calls } = fakeReviewer(FINDING_JSON);
    const files = [file("src/auth.ts", "function login() { return true; }")];
    const priorResults: CheckResult[] = [
      { type: "secrets", status: "fail", title: "Secret Scanner", summary: "secret found", details: {} },
    ];

    const result = await checkSemantic(files, baseConfig, { reviewCall: call, priorResults });

    expect(result.status).toBe("pass");
    expect((result.details as any).skipped).toBe(true);
    expect((result.details as any).reason).toContain("static tier failed");
    expect(calls()).toBe(0);
  });

  test("run_only_on_clean=false reviews even when a prior static tier failed", async () => {
    const { call, calls } = fakeReviewer("[]");
    const files = [file("src/index.ts", "const x = 1;")];
    const priorResults: CheckResult[] = [
      { type: "secrets", status: "fail", title: "Secret Scanner", summary: "secret found", details: {} },
    ];

    const result = await checkSemantic(
      files,
      { ...baseConfig, run_only_on_clean: false },
      { reviewCall: call, priorResults },
    );

    expect(calls()).toBe(1);
    expect(result.status).toBe("pass");
  });

  test("skips cleanly when there are no added lines to review", async () => {
    const { call, calls } = fakeReviewer(FINDING_JSON);
    const result = await checkSemantic([], baseConfig, { reviewCall: call });
    expect(result.status).toBe("pass");
    expect((result.details as any).skipped).toBe(true);
    expect(calls()).toBe(0);
  });

  test("malformed LLM output is treated as no findings (pass), not a crash", async () => {
    const { call } = fakeReviewer("the diff looks fine to me, no JSON here");
    const files = [file("src/index.ts", "const x = 1;")];
    const result = await checkSemantic(files, baseConfig, { reviewCall: call });
    expect(result.status).toBe("pass");
    expect((result.details as any).count).toBe(0);
  });
});
