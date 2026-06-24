import { describe, test, expect } from "bun:test";
import { CHECK_TYPE_PROMPTS } from "../../packages/engine/src/ai/prompts";
import { getSurroundingLines } from "../../packages/engine/src/ai/suggest-fix";

describe("AI Suggestions Integration", () => {
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
