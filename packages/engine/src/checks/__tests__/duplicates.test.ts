import { describe, test, expect } from "bun:test";
import { checkDuplicates } from "../duplicates";
import type { CommitInfo, DuplicateCheckConfig } from "../../types";

const defaultConfig: DuplicateCheckConfig = {
  enabled: true,
  severity: "warn",
  lookback: 10,
};

function commit(sha: string, message: string): CommitInfo {
  return { sha, message, author: "test", timestamp: new Date().toISOString() };
}

describe("Duplicate Commit Detector", () => {
  // === Should WARN ===

  test("warns on two commits with identical messages", async () => {
    const commits = [commit("abc1234", "fix: resolve auth bug")];
    const previous = [commit("def5678", "fix: resolve auth bug")];
    const result = await checkDuplicates(commits, previous, defaultConfig);
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).length).toBeGreaterThan(0);
    expect((result.details.findings as any[])[0].type).toBe("identical");
  });

  test("warns on two consecutive commits with identical messages in same batch", async () => {
    const commits = [
      commit("abc1234", "fix: update styles"),
      commit("def5678", "fix: update styles"),
    ];
    const result = await checkDuplicates(commits, [], defaultConfig);
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).some((f: any) => f.type === "identical")).toBe(true);
  });

  test("warns on revert commit matching previous", async () => {
    const commits = [commit("abc1234", 'Revert "feat: add user dashboard"')];
    const previous = [commit("def5678", "feat: add user dashboard")];
    const result = await checkDuplicates(commits, previous, defaultConfig);
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).some((f: any) => f.type === "revert")).toBe(true);
  });

  test("warns on near-identical commit messages (high similarity)", async () => {
    const commits = [commit("abc1234", "fix: resolve authentication bug in login")];
    const previous = [commit("def5678", "fix: resolve authentication bug in logon")];
    const result = await checkDuplicates(commits, previous, defaultConfig);
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).some((f: any) => f.type === "near-identical")).toBe(true);
  });

  test("warns when commit message matches one from 3 commits ago", async () => {
    const commits = [commit("new1234", "fix: update config")];
    const previous = [
      commit("prev1", "chore: cleanup"),
      commit("prev2", "feat: add feature"),
      commit("prev3", "fix: update config"),
    ];
    const result = await checkDuplicates(commits, previous, defaultConfig);
    expect(result.status).toBe("fail");
  });

  // === Should PASS ===

  test("passes with commits touching different topics", async () => {
    const commits = [commit("abc1234", "feat: add user dashboard")];
    const previous = [commit("def5678", "fix: resolve database connection issue")];
    const result = await checkDuplicates(commits, previous, defaultConfig);
    expect(result.status).toBe("pass");
  });

  test("passes with meaningfully different messages", async () => {
    const commits = [commit("abc1234", "feat: implement OAuth flow")];
    const previous = [commit("def5678", "fix: repair broken sidebar nav")];
    const result = await checkDuplicates(commits, previous, defaultConfig);
    expect(result.status).toBe("pass");
  });

  test("passes when revert is outside lookback window", async () => {
    const commits = [commit("abc1234", 'Revert "feat: add old feature"')];
    // Previous commits are beyond the lookback window of 5
    const previous: CommitInfo[] = [];
    for (let i = 0; i < 10; i++) {
      previous.push(commit(`prev${i}`, `commit ${i}`));
    }
    previous.push(commit("old", "feat: add old feature"));
    const config: DuplicateCheckConfig = { ...defaultConfig, lookback: 5 };
    const result = await checkDuplicates(commits, previous, config);
    expect(result.status).toBe("pass");
  });

  // === Config ===

  test("lookback: 5 limits comparison to last 5 commits", async () => {
    const commits = [commit("new1", "fix: resolve issue")];
    const previous: CommitInfo[] = [];
    for (let i = 0; i < 10; i++) {
      previous.push(commit(`prev${i}`, `commit ${i}`));
    }
    // Place the matching commit at position 7 (outside lookback of 5)
    previous[7] = commit("prev7", "fix: resolve issue");
    const config: DuplicateCheckConfig = { ...defaultConfig, lookback: 5 };
    const result = await checkDuplicates(commits, previous, config);
    expect(result.status).toBe("pass");
  });

  test("lookback: 20 expands the comparison window", async () => {
    const commits = [commit("new1", "fix: resolve issue")];
    const previous: CommitInfo[] = [];
    for (let i = 0; i < 15; i++) {
      previous.push(commit(`prev${i}`, `commit ${i}`));
    }
    // Place matching commit at position 12
    previous[12] = commit("prev12", "fix: resolve issue");
    const config: DuplicateCheckConfig = { ...defaultConfig, lookback: 20 };
    const result = await checkDuplicates(commits, previous, config);
    expect(result.status).toBe("fail");
  });

  test("passes with empty commits", async () => {
    const result = await checkDuplicates([], [], defaultConfig);
    expect(result.status).toBe("pass");
  });
});
