import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promises as fs } from "node:fs";

import type { PipelineInput, ChangedFile } from "@lastgate/engine";
import { loadBaseline } from "@lastgate/engine";
import { runStepperLoop } from "../step";

function input(files: ChangedFile[]): PipelineInput {
  return {
    files,
    commits: [{ sha: "abc1234", message: "feat: test", author: "test", timestamp: new Date().toISOString() }],
    branch: "HEAD",
    repoFullName: "test/repo",
    // Keep slow checks off; secrets is the deterministic failing path we exercise.
    config: {
      checks: {
        secrets: { enabled: true, severity: "fail" },
        file_patterns: { enabled: false, severity: "fail" },
        commit_message: { enabled: false, severity: "warn", require_conventional: true },
        agent_patterns: { enabled: false, severity: "warn" },
        duplicates: { enabled: false, severity: "warn", lookback: 10 },
        lint: { enabled: false, severity: "fail" },
        dependencies: { enabled: false, severity: "warn" },
        build: { enabled: false, severity: "fail" },
      },
    },
  };
}

let workDir: string;
beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "lastgate-step-"));
});
afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("runStepperLoop", () => {
  test("clean diff streams through and exits 0", async () => {
    const printed: string[] = [];
    const state = await runStepperLoop({
      input: input([{ path: "src/x.ts", content: "const x = 1;\n", status: "added" }]),
      profile: "fast",
      scriptedAnswers: [],
      onPrint: (s) => printed.push(s),
      baselinePath: join(workDir, "baseline.json"),
    });
    expect(state.exitCode).toBe(0);
    expect(state.results.every((r) => r.final === "pass")).toBe(true);
    expect(printed.some((l) => l.includes("Secret Scanner") || l.includes("✓"))).toBe(true);
  });

  test("[q]uit on first failing step exits 1", async () => {
    const state = await runStepperLoop({
      input: input([{ path: "src/x.ts", content: 'const k = "AKIAIOSFODNN7EXAMPLE";\n', status: "added" }]),
      profile: "fast",
      scriptedAnswers: ["q"],
      onPrint: () => {},
      baselinePath: join(workDir, "baseline.json"),
    });
    expect(state.exitCode).toBe(1);
    expect(state.results.at(-1)?.final).toBe("quit");
  });

  test("[c]ontinue on a fail records the fail and exits 1 at end", async () => {
    const state = await runStepperLoop({
      input: input([{ path: "src/x.ts", content: 'const k = "AKIAIOSFODNN7EXAMPLE";\n', status: "added" }]),
      profile: "fast",
      scriptedAnswers: ["c"],
      onPrint: () => {},
      baselinePath: join(workDir, "baseline.json"),
    });
    expect(state.exitCode).toBe(1);
    expect(state.results.at(-1)?.final).toBe("fail");
  });

  test("[s]kip step records skipped and does NOT set exit code", async () => {
    const state = await runStepperLoop({
      input: input([{ path: "src/x.ts", content: 'const k = "AKIAIOSFODNN7EXAMPLE";\n', status: "added" }]),
      profile: "fast",
      scriptedAnswers: ["s"],
      onPrint: () => {},
      baselinePath: join(workDir, "baseline.json"),
    });
    expect(state.exitCode).toBe(0);
    expect(state.results.at(-1)?.final).toBe("skipped");
  });

  test("[a]llowlist writes fingerprints to baseline and re-runs the step green", async () => {
    const baselinePath = join(workDir, "baseline.json");
    const state = await runStepperLoop({
      input: input([{ path: "src/x.ts", content: 'const k = "AKIAIOSFODNN7EXAMPLE";\n', status: "added" }]),
      profile: "fast",
      scriptedAnswers: ["a"],
      onPrint: () => {},
      baselinePath,
    });
    expect(state.exitCode).toBe(0);
    expect(state.results.at(-1)?.final).toBe("pass");

    const stored = await loadBaseline(baselinePath);
    expect(stored.size).toBeGreaterThan(0);
    const text = await fs.readFile(baselinePath, "utf8");
    const parsed = JSON.parse(text);
    expect(parsed.version).toBe(1);
    expect(Array.isArray(parsed.fingerprints)).toBe(true);
  });

  test("unrecognized choice loops back to the same prompt", async () => {
    const state = await runStepperLoop({
      input: input([{ path: "src/x.ts", content: 'const k = "AKIAIOSFODNN7EXAMPLE";\n', status: "added" }]),
      profile: "fast",
      scriptedAnswers: ["xyz", "c"], // first answer ignored, second wins
      onPrint: () => {},
      baselinePath: join(workDir, "baseline.json"),
    });
    expect(state.exitCode).toBe(1);
    expect(state.results.at(-1)?.final).toBe("fail");
  });
});
