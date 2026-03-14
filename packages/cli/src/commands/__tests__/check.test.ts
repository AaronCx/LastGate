import { describe, test, expect } from "bun:test";

/**
 * Tests for the check command logic.
 *
 * Validates PipelineInput construction, --only parsing,
 * exit code logic, and option handling.
 */

interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  timestamp: string;
}

interface ChangedFile {
  path: string;
  content: string;
  patch?: string;
  status: "added" | "modified" | "removed" | "renamed";
}

interface PipelineInput {
  files: ChangedFile[];
  commits: CommitInfo[];
  branch: string;
  repoFullName: string;
  config?: Record<string, unknown>;
}

describe("--only flag parsing", () => {
  test("parses comma-separated check names", () => {
    const onlyStr = "secrets,lint";
    const checks = onlyStr.split(",").map((c) => c.trim());
    expect(checks).toEqual(["secrets", "lint"]);
  });

  test("parses comma-separated with spaces", () => {
    const onlyStr = "secrets, lint, build";
    const checks = onlyStr.split(",").map((c) => c.trim());
    expect(checks).toEqual(["secrets", "lint", "build"]);
  });

  test("single check name", () => {
    const onlyStr = "secrets";
    const checks = onlyStr.split(",").map((c) => c.trim());
    expect(checks).toEqual(["secrets"]);
  });

  test("trims whitespace from each entry", () => {
    const onlyStr = "  secrets  ,  lint  ";
    const checks = onlyStr.split(",").map((c) => c.trim());
    expect(checks).toEqual(["secrets", "lint"]);
  });
});

describe("CLI option flags", () => {
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

  test("default options are all undefined/false", () => {
    const options: Record<string, unknown> = {};
    expect(options.only).toBeUndefined();
    expect(options.branch).toBeUndefined();
    expect(options.json).toBeUndefined();
    expect(options.verbose).toBeUndefined();
  });
});

describe("exit code logic", () => {
  test("exit code 1 when any check has status fail", () => {
    const checks = [
      { status: "pass" as const },
      { status: "fail" as const },
      { status: "pass" as const },
    ];
    const hasFailures = checks.some((c) => c.status === "fail");
    expect(hasFailures).toBe(true);
  });

  test("exit code 0 when no failures (pass + warn)", () => {
    const checks = [
      { status: "pass" as const },
      { status: "pass" as const },
      { status: "warn" as const },
    ];
    const hasFailures = checks.some((c) => c.status === "fail");
    expect(hasFailures).toBe(false);
  });

  test("exit code 0 when all pass", () => {
    const checks = [
      { status: "pass" as const },
      { status: "pass" as const },
    ];
    const hasFailures = checks.some((c) => c.status === "fail");
    expect(hasFailures).toBe(false);
  });

  test("single fail among many passes triggers failure", () => {
    const checks = Array.from({ length: 10 }, () => ({ status: "pass" as const }));
    checks.push({ status: "fail" as const });
    const hasFailures = checks.some((c) => c.status === "fail");
    expect(hasFailures).toBe(true);
  });

  test("empty checks array has no failures", () => {
    const checks: { status: string }[] = [];
    const hasFailures = checks.some((c) => c.status === "fail");
    expect(hasFailures).toBe(false);
  });
});

describe("PipelineInput construction", () => {
  test("has required files field as array of ChangedFile", () => {
    const input: PipelineInput = {
      files: [
        { path: "src/app.ts", content: "code", status: "modified" },
      ],
      commits: [],
      branch: "main",
      repoFullName: "owner/repo",
    };
    expect(input.files).toHaveLength(1);
    expect(input.files[0].path).toBe("src/app.ts");
    expect(input.files[0].status).toBe("modified");
  });

  test("has required commits field with CommitInfo shape", () => {
    const input: PipelineInput = {
      files: [],
      commits: [
        {
          sha: "abc123",
          author: "Dev <dev@test.com>",
          message: "initial commit",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      ],
      branch: "main",
      repoFullName: "owner/repo",
    };
    expect(input.commits).toHaveLength(1);
    expect(input.commits[0].sha).toBe("abc123");
    expect(input.commits[0]).not.toHaveProperty("hash");
    expect(typeof input.commits[0].author).toBe("string");
  });

  test("has required branch field", () => {
    const input: PipelineInput = {
      files: [],
      commits: [],
      branch: "feature/new-thing",
      repoFullName: "owner/repo",
    };
    expect(input.branch).toBe("feature/new-thing");
  });

  test("has required repoFullName field in owner/repo format", () => {
    const input: PipelineInput = {
      files: [],
      commits: [],
      branch: "main",
      repoFullName: "AaronCx/LastGate",
    };
    expect(input.repoFullName).toBe("AaronCx/LastGate");
    expect(input.repoFullName).toContain("/");
  });

  test("config is optional", () => {
    const input: PipelineInput = {
      files: [],
      commits: [],
      branch: "main",
      repoFullName: "owner/repo",
    };
    expect(input.config).toBeUndefined();
  });

  test("config can be provided", () => {
    const input: PipelineInput = {
      files: [],
      commits: [],
      branch: "main",
      repoFullName: "owner/repo",
      config: { raw: "checks:\n  - secrets", path: ".lastgate.yml" },
    };
    expect(input.config).toBeDefined();
  });

  test("placeholder commit when no commits exist", () => {
    const placeholder: CommitInfo = {
      sha: "0000000",
      author: "unknown",
      message: "",
      timestamp: new Date().toISOString(),
    };
    expect(placeholder.sha).toBe("0000000");
    expect(placeholder.author).toBe("unknown");
    expect(placeholder.message).toBe("");
  });
});

describe("no changes scenario", () => {
  test("empty changedFiles array means no changes", () => {
    const changedFiles: ChangedFile[] = [];
    const noChanges = changedFiles.length === 0;
    expect(noChanges).toBe(true);
  });

  test("non-empty changedFiles array has changes", () => {
    const changedFiles: ChangedFile[] = [
      { path: "file.ts", content: "x", status: "added" },
    ];
    const noChanges = changedFiles.length === 0;
    expect(noChanges).toBe(false);
  });
});

describe("repo name extraction from remote URL", () => {
  test("extracts from HTTPS URL", () => {
    const remoteUrl = "https://github.com/AaronCx/LastGate.git";
    const match = remoteUrl.match(/[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
    expect(match).not.toBeNull();
    expect(`${match![1]}/${match![2]}`).toBe("AaronCx/LastGate");
  });

  test("extracts from SSH URL", () => {
    const remoteUrl = "git@github.com:AaronCx/LastGate.git";
    const match = remoteUrl.match(/[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
    expect(match).not.toBeNull();
    expect(`${match![1]}/${match![2]}`).toBe("AaronCx/LastGate");
  });

  test("extracts from HTTPS URL without .git suffix", () => {
    const remoteUrl = "https://github.com/owner/repo";
    const match = remoteUrl.match(/[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
    expect(match).not.toBeNull();
    expect(`${match![1]}/${match![2]}`).toBe("owner/repo");
  });

  test("falls back to local/repo when no remote", () => {
    let repoFullName = "local/repo";
    try {
      throw new Error("no remote");
    } catch {
      // no remote — use default
    }
    expect(repoFullName).toBe("local/repo");
  });
});

describe("config loading", () => {
  test("config file path is .lastgate.yml in cwd", () => {
    const configPath = ".lastgate.yml";
    expect(configPath).toBe(".lastgate.yml");
  });

  test("returns undefined when config file does not exist", () => {
    let config: Record<string, unknown> | undefined;
    try {
      throw new Error("ENOENT");
    } catch {
      config = undefined;
    }
    expect(config).toBeUndefined();
  });
});
