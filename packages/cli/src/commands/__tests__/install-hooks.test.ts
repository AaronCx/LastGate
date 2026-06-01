import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promises as fs } from "node:fs";
import { execSync } from "node:child_process";

import { runInstallHooks } from "../install-hooks";

let workDir: string;
let originalCwd: string;

beforeEach(() => {
  originalCwd = process.cwd();
  // macOS resolves /var/folders → /private/var/folders; git always reports the resolved path.
  workDir = realpathSync(mkdtempSync(join(tmpdir(), "lastgate-hooks-")));
  execSync("git init", { cwd: workDir, stdio: "ignore" });
  process.chdir(workDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  rmSync(workDir, { recursive: true, force: true });
});

describe("install-hooks", () => {
  test("writes runnable pre-commit (fast) and pre-push (full) into .git/hooks", async () => {
    const captured: string[] = [];
    const result = await runInstallHooks({}, (s) => captured.push(s));

    expect(result.installed).toEqual(["pre-commit", "pre-push"]);
    expect(result.isHusky).toBe(false);
    expect(result.hookDir).toBe(join(workDir, ".git", "hooks"));

    const preCommit = await fs.readFile(join(workDir, ".git", "hooks", "pre-commit"), "utf8");
    expect(preCommit).toContain("lastgate check --staged --profile fast");
    expect(preCommit).toMatch(/^#!/);

    const prePush = await fs.readFile(join(workDir, ".git", "hooks", "pre-push"), "utf8");
    expect(prePush).toContain("lastgate check --profile full");

    const stat = await fs.stat(join(workDir, ".git", "hooks", "pre-commit"));
    // executable bit
    expect((stat.mode & 0o111) !== 0).toBe(true);
  });

  test("idempotent — re-running updates the managed block in place", async () => {
    await runInstallHooks({}, () => {});
    const before = await fs.readFile(join(workDir, ".git", "hooks", "pre-commit"), "utf8");
    await runInstallHooks({}, () => {});
    const after = await fs.readFile(join(workDir, ".git", "hooks", "pre-commit"), "utf8");
    // Same content (no duplicated managed block)
    expect(after).toBe(before);
    expect((after.match(/lastgate: managed block/g) ?? []).length).toBe(2); // begin + end
  });

  test("preserves the user's existing hook content outside the managed block", async () => {
    const path = join(workDir, ".git", "hooks", "pre-commit");
    await fs.mkdir(join(workDir, ".git", "hooks"), { recursive: true });
    await fs.writeFile(path, "#!/usr/bin/env sh\necho 'user hook'\n", { mode: 0o755 });

    await runInstallHooks({}, () => {});
    const result = await fs.readFile(path, "utf8");
    expect(result).toContain("echo 'user hook'");
    expect(result).toContain("lastgate check --staged");
  });

  test("--uninstall removes the managed block and deletes empty hooks", async () => {
    await runInstallHooks({}, () => {});
    const result = await runInstallHooks({ uninstall: true }, () => {});
    expect(result.removed).toEqual(["pre-commit", "pre-push"]);
    await expect(fs.access(join(workDir, ".git", "hooks", "pre-commit"))).rejects.toThrow();
  });

  test("detects Husky and installs there instead", async () => {
    await fs.mkdir(join(workDir, ".husky"), { recursive: true });
    const result = await runInstallHooks({}, () => {});
    expect(result.isHusky).toBe(true);
    expect(result.hookDir).toBe(join(workDir, ".husky"));
    const preCommit = await fs.readFile(join(workDir, ".husky", "pre-commit"), "utf8");
    expect(preCommit).toContain("lastgate check --staged --profile fast");
  });

  test("--pre-commit-profile and --pre-push-profile flags are honored", async () => {
    await runInstallHooks(
      { preCommitProfile: "full", prePushProfile: "fast" },
      () => {},
    );
    const preCommit = await fs.readFile(join(workDir, ".git", "hooks", "pre-commit"), "utf8");
    expect(preCommit).toContain("--profile full");
    const prePush = await fs.readFile(join(workDir, ".git", "hooks", "pre-push"), "utf8");
    expect(prePush).toContain("--profile fast");
  });
});
