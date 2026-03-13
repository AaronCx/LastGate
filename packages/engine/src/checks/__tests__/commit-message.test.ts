import { describe, test, expect } from "bun:test";
import { checkCommitMessage } from "../commit-message";
import type { CommitInfo, CommitMessageCheckConfig } from "../../types";

const defaultConfig: CommitMessageCheckConfig = {
  enabled: true,
  severity: "warn",
  require_conventional: true,
};

function commit(message: string, sha = "abc1234"): CommitInfo {
  return { sha, message, author: "test", timestamp: new Date().toISOString() };
}

describe("Commit Message Validator", () => {
  // === Should WARN (fail in code, since it returns "fail" status) ===

  test("warns on generic message: 'update'", async () => {
    const result = await checkCommitMessage([commit("update")], defaultConfig);
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).some((f: any) => f.issue.includes("Generic"))).toBe(true);
  });

  test("warns on generic message: 'fix'", async () => {
    const result = await checkCommitMessage([commit("fix")], defaultConfig);
    expect(result.status).toBe("fail");
  });

  test("warns on generic message: 'changes'", async () => {
    const result = await checkCommitMessage([commit("changes")], defaultConfig);
    expect(result.status).toBe("fail");
  });

  test("warns on generic message: 'wip'", async () => {
    const result = await checkCommitMessage([commit("wip")], defaultConfig);
    expect(result.status).toBe("fail");
  });

  test("warns on empty message", async () => {
    const result = await checkCommitMessage([commit("")], defaultConfig);
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).some((f: any) => f.issue.includes("too short"))).toBe(true);
  });

  test("warns on gibberish message: 'asdfghjkl'", async () => {
    const result = await checkCommitMessage([commit("asdfghjkl")], defaultConfig);
    expect(result.status).toBe("fail");
  });

  test("warns on suspiciously long message (500+ chars)", async () => {
    const longMsg = "feat: " + "a".repeat(600);
    const result = await checkCommitMessage([commit(longMsg)], defaultConfig);
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).some((f: any) => f.issue.includes("suspiciously long"))).toBe(true);
  });

  test("warns on message containing stack trace", async () => {
    const msg = "fix: resolved error\n  at Object.<anonymous> (src/index.ts:42:10)";
    const result = await checkCommitMessage([commit(msg)], defaultConfig);
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).some((f: any) => f.issue.includes("stack trace"))).toBe(true);
  });

  test("warns on message containing code blocks", async () => {
    const msg = "fix: resolved the `validateUserInputFromFormSubmission` error in auth module";
    const result = await checkCommitMessage([commit(msg)], defaultConfig);
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).some((f: any) => f.issue.includes("code or stack"))).toBe(true);
  });

  // === Should PASS ===

  test("passes conventional commit: 'feat: add user authentication flow'", async () => {
    const result = await checkCommitMessage([commit("feat: add user authentication flow")], defaultConfig);
    expect(result.status).toBe("pass");
  });

  test("passes conventional commit: 'fix: resolve race condition in agent executor'", async () => {
    const result = await checkCommitMessage([commit("fix: resolve race condition in agent executor")], defaultConfig);
    expect(result.status).toBe("pass");
  });

  test("passes conventional commit: 'chore: update dependencies'", async () => {
    const result = await checkCommitMessage([commit("chore: update dependencies")], defaultConfig);
    expect(result.status).toBe("pass");
  });

  test("passes conventional commit: 'docs: add API documentation for check endpoints'", async () => {
    const result = await checkCommitMessage([commit("docs: add API documentation for check endpoints")], defaultConfig);
    expect(result.status).toBe("pass");
  });

  test("passes conventional commit with scope: 'refactor(engine): extract secret patterns'", async () => {
    const result = await checkCommitMessage([commit("refactor(engine): extract secret patterns to separate module")], defaultConfig);
    expect(result.status).toBe("pass");
  });

  // === Config ===

  test("require_conventional: true fails on non-conventional message", async () => {
    const config = { ...defaultConfig, require_conventional: true };
    const result = await checkCommitMessage([commit("added a new feature")], config);
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).some((f: any) => f.issue.includes("conventional"))).toBe(true);
  });

  test("require_conventional: false passes on non-conventional message", async () => {
    const config = { ...defaultConfig, require_conventional: false };
    const result = await checkCommitMessage([commit("added a new feature")], config);
    expect(result.status).toBe("pass");
  });

  test("handles multiple commits, reports all issues", async () => {
    const commits = [
      commit("update", "sha1"),
      commit("feat: good commit", "sha2"),
      commit("wip", "sha3"),
    ];
    const result = await checkCommitMessage(commits, defaultConfig);
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).length).toBeGreaterThanOrEqual(2);
  });
});
