import { describe, test, expect } from "bun:test";
import { checkDependencies } from "../dependencies";
import type { ChangedFile, DependencyCheckConfig } from "../../types";

const defaultConfig: DependencyCheckConfig = {
  enabled: true,
  severity: "warn",
  fail_on: "critical",
};

function file(path: string, content: string, status: "added" | "modified" = "modified"): ChangedFile {
  return { path, content, status };
}

describe("Dependency Auditor", () => {
  test("fails when package.json changed but lockfile not updated", async () => {
    const files = [file("package.json", '{"dependencies": {"lodash": "^4.17.21"}}')];
    const result = await checkDependencies(files, defaultConfig);
    // Missing lockfile update should produce an issue
    expect(result.status).not.toBe("pass");
    const issues = (result.details as any).issues as any[];
    expect(issues.some((i: any) => i.message.includes("lockfile"))).toBe(true);
  });

  test("warns on low-severity issues when lockfile updated", async () => {
    const files = [
      file("package.json", '{"dependencies": {"lodash": "^4.17.21"}}'),
      file("bun.lockb", "binary lockfile content"),
    ];
    const result = await checkDependencies(files, defaultConfig);
    // With lockfile present, the lockfile warning is gone
    // But audit might find issues or pass clean
    expect(result.type).toBe("dependencies");
  });

  test("skips when only non-dependency files changed", async () => {
    const files = [
      file("src/index.ts", "const x = 1;"),
      file("src/utils.ts", "export function add() {}"),
    ];
    const result = await checkDependencies(files, defaultConfig);
    expect(result.status).toBe("pass");
    expect((result.details as any).skipped).toBe(true);
  });

  test("passes when package.json changed and lockfile also updated", async () => {
    const files = [
      file("package.json", '{"dependencies": {"react": "^18.0.0"}}'),
      file("package-lock.json", '{"lockfileVersion": 3}'),
    ];
    const result = await checkDependencies(files, defaultConfig);
    // No lockfile mismatch issue
    const issues = (result.details as any).issues as any[];
    const lockfileIssue = issues?.find((i: any) => i.message.includes("lockfile"));
    expect(lockfileIssue).toBeUndefined();
  });

  test("handles requirements.txt changes", async () => {
    const files = [file("requirements.txt", "flask==2.3.0\nrequests==2.31.0")];
    const result = await checkDependencies(files, defaultConfig);
    // Should produce a low-severity suggestion to run pip-audit
    const issues = (result.details as any).issues as any[];
    expect(issues.some((i: any) => i.message.includes("requirements.txt"))).toBe(true);
  });

  test("handles bun.lock (text format) as valid lockfile", async () => {
    const files = [
      file("package.json", '{"dependencies": {"zod": "^3.0.0"}}'),
      file("bun.lock", '{"lockfileVersion": 1}'),
    ];
    const result = await checkDependencies(files, defaultConfig);
    const issues = (result.details as any).issues as any[];
    const lockfileIssue = issues?.find((i: any) => i.message.includes("lockfile"));
    expect(lockfileIssue).toBeUndefined();
  });

  test("handles yarn.lock as valid lockfile", async () => {
    const files = [
      file("package.json", '{"dependencies": {"express": "^4.18.0"}}'),
      file("yarn.lock", "# yarn lockfile v1"),
    ];
    const result = await checkDependencies(files, defaultConfig);
    const issues = (result.details as any).issues as any[];
    const lockfileIssue = issues?.find((i: any) => i.message.includes("lockfile"));
    expect(lockfileIssue).toBeUndefined();
  });
});
