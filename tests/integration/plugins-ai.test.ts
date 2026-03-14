import { describe, test, expect } from "bun:test";
import { runCustomChecks } from "../../packages/engine/src/checks/custom";
import { buildPrompt, CHECK_TYPE_PROMPTS } from "../../packages/engine/src/ai/prompts";
import { getSurroundingLines } from "../../packages/engine/src/ai/suggest-fix";

describe("Custom Plugins + AI Suggestions Integration", () => {
  test("custom check fails → AI prompt can be built for the custom check finding", async () => {
    const checks = [
      {
        module: {
          name: "no-console",
          description: "Disallow console.log in production code",
          severity: "warn" as const,
          run: async (files: any[]) => ({
            status: "warn",
            title: "console.log found",
            findings: [{ file: "src/index.ts", line: 5, message: "console.log detected" }],
          }),
        },
        config: {},
        severity: "warn" as const,
      },
    ];

    const results = await runCustomChecks(checks, [], {});
    expect(results.length).toBe(1);

    // AI prompt can be built for custom check type
    const prompt = buildPrompt("agent_patterns"); // Custom checks fall back
    expect(prompt).toContain("LastGate");
  });

  test("surrounding lines extracted correctly for AI context", () => {
    const content = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join("\n");
    const surrounding = getSurroundingLines(content, 10, 3);
    expect(surrounding).toContain("7:");
    expect(surrounding).toContain("13:");
    expect(surrounding).toContain("line 10");
  });

  test("all 8 check types have AI prompts defined", () => {
    const types = ["secrets", "lint", "build", "commit_message", "file_patterns", "dependencies", "duplicates", "agent_patterns"];
    for (const type of types) {
      expect(CHECK_TYPE_PROMPTS[type]).toBeDefined();
    }
  });
});
