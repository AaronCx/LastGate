import { describe, test, expect } from "bun:test";
import { buildPrompt, SYSTEM_PROMPT, CHECK_TYPE_PROMPTS } from "../prompts";

describe("AI Prompts", () => {
  test("system prompt includes code reviewer context", () => {
    expect(SYSTEM_PROMPT).toContain("code reviewer");
    expect(SYSTEM_PROMPT).toContain("LastGate");
  });

  test("buildPrompt includes system prompt and check type prompt", () => {
    const prompt = buildPrompt("secrets");
    expect(prompt).toContain(SYSTEM_PROMPT);
    expect(prompt).toContain("environment variable");
  });

  test("secrets prompt emphasizes moving to env vars", () => {
    expect(CHECK_TYPE_PROMPTS.secrets).toContain("environment variable");
    expect(CHECK_TYPE_PROMPTS.secrets).toContain("secrets manager");
  });

  test("lint prompt includes style conventions", () => {
    expect(CHECK_TYPE_PROMPTS.lint).toContain("lint");
  });

  test("build prompt includes error analysis", () => {
    expect(CHECK_TYPE_PROMPTS.build).toContain("build failure");
    expect(CHECK_TYPE_PROMPTS.build).toContain("type error");
  });

  test("commit_message prompt suggests conventional commit format", () => {
    expect(CHECK_TYPE_PROMPTS.commit_message).toContain("conventional commit");
  });

  test("dependencies prompt suggests fix", () => {
    expect(CHECK_TYPE_PROMPTS.dependencies).toContain("dependency");
  });

  test("buildPrompt with unknown type returns system prompt only", () => {
    const prompt = buildPrompt("unknown_check");
    expect(prompt).toBe(SYSTEM_PROMPT);
  });

  test("all 8 check types have prompts defined", () => {
    const types = ["secrets", "lint", "build", "commit_message", "file_patterns", "dependencies", "duplicates", "agent_patterns"];
    for (const type of types) {
      expect(CHECK_TYPE_PROMPTS[type]).toBeDefined();
      expect(CHECK_TYPE_PROMPTS[type].length).toBeGreaterThan(10);
    }
  });
});
