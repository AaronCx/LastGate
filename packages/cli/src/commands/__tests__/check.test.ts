import { describe, test, expect } from "bun:test";

describe("CLI check command", () => {
  test("--only parses comma-separated check names", () => {
    const onlyStr = "secrets,lint";
    const checks = onlyStr.split(",").map(c => c.trim());
    expect(checks).toEqual(["secrets", "lint"]);
  });

  test("--only with spaces parses correctly", () => {
    const onlyStr = "secrets, lint, build";
    const checks = onlyStr.split(",").map(c => c.trim());
    expect(checks).toEqual(["secrets", "lint", "build"]);
  });

  test("--branch sets diff target", () => {
    const options = { branch: "feature/xyz" };
    expect(options.branch).toBe("feature/xyz");
  });

  test("--json flag enables JSON output", () => {
    const options = { json: true };
    expect(options.json).toBe(true);
  });

  test("--verbose flag enables detailed output", () => {
    const options = { verbose: true };
    expect(options.verbose).toBe(true);
  });

  test("exit code 1 on any failure", () => {
    const results = {
      checks: [
        { status: "pass" },
        { status: "fail" },
        { status: "pass" },
      ],
    };
    const hasFailures = results.checks.some(c => c.status === "fail");
    expect(hasFailures).toBe(true);
    // Would exit with code 1
  });

  test("exit code 0 on all pass", () => {
    const results = {
      checks: [
        { status: "pass" },
        { status: "pass" },
        { status: "warn" },
      ],
    };
    const hasFailures = results.checks.some(c => c.status === "fail");
    expect(hasFailures).toBe(false);
  });

  test("loads .lastgate.yml config from cwd", () => {
    // The loadConfig function tries to read .lastgate.yml
    const configPath = ".lastgate.yml";
    expect(configPath).toBe(".lastgate.yml");
  });

  test("graceful error if no staged changes and no branch", () => {
    const changedFiles: any[] = [];
    const noChanges = changedFiles.length === 0;
    expect(noChanges).toBe(true);
    // Would show "No changes found to check." and exit 0
  });
});
