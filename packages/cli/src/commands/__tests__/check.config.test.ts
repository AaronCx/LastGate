import { describe, test, expect, afterEach } from "bun:test";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadConfig } from "../check";
import { runCheckPipeline } from "@lastgate/engine";

/**
 * Regression tests for Finding F1 (docs/fp-investigation.md):
 *
 * Before this fix the CLI's loadConfig returned a `{ raw, path }` text blob
 * instead of parsing the YAML. The pipeline's shallow merge then ignored
 * every user-set field — `allow`, per-check `severity`, `entropy_threshold`,
 * `entropy_severity`, `baseline` — and the local `lastgate check` ran on
 * engine defaults exclusively.
 *
 * loadConfig now calls `parseConfig`. These tests guard against the
 * regression by exercising the round-trip end-to-end.
 */

const ENVS_TO_RESTORE = ["LASTGATE_CONFIG"] as const;
const originalCwd = process.cwd();
let workDir: string | null = null;

afterEach(() => {
  process.chdir(originalCwd);
  if (workDir) {
    try { rmSync(workDir, { recursive: true, force: true }); } catch {}
    workDir = null;
  }
  for (const key of ENVS_TO_RESTORE) delete process.env[key];
});

function inTempCwd(): string {
  workDir = realpathSync(mkdtempSync(join(tmpdir(), "lastgate-fix-f1-")));
  process.chdir(workDir);
  return workDir;
}

describe("loadConfig — parses .lastgate.yml into a PipelineConfig", () => {
  test("returns undefined when no config file exists", async () => {
    inTempCwd();
    expect(await loadConfig()).toBeUndefined();
  });

  test("parses checks.secrets.severity from YAML", async () => {
    inTempCwd();
    writeFileSync(
      ".lastgate.yml",
      `version: 1\nchecks:\n  secrets:\n    enabled: true\n    severity: warn\n`,
    );
    const cfg = await loadConfig();
    expect(cfg).toBeDefined();
    expect(cfg!.checks.secrets?.severity).toBe("warn");
  });

  test("parses top-level allow + baseline fields", async () => {
    inTempCwd();
    writeFileSync(
      ".lastgate.yml",
      `version: 1\nallow:\n  - "**/*.example"\n  - "fixtures/**"\nbaseline: .my-baseline.json\n`,
    );
    const cfg = await loadConfig();
    expect(cfg).toBeDefined();
    expect(cfg!.allow).toEqual(["**/*.example", "fixtures/**"]);
    expect(cfg!.baseline).toBe(".my-baseline.json");
  });

  test("parses secrets.entropy_threshold + entropy_severity", async () => {
    inTempCwd();
    writeFileSync(
      ".lastgate.yml",
      `version: 1\nchecks:\n  secrets:\n    enabled: true\n    severity: fail\n    entropy_threshold: 5.5\n    entropy_severity: low\n`,
    );
    const cfg = await loadConfig();
    expect(cfg).toBeDefined();
    expect(cfg!.checks.secrets?.entropy_threshold).toBe(5.5);
    expect(cfg!.checks.secrets?.entropy_severity).toBe("low");
  });
});

describe("F1 end-to-end — YAML severity reaches the pipeline status", () => {
  test("severity: warn downgrades a real AWS-key match from fail to warn", async () => {
    inTempCwd();
    writeFileSync(
      ".lastgate.yml",
      `version: 1\nchecks:\n  secrets:\n    enabled: true\n    severity: warn\n`,
    );
    const config = await loadConfig();
    const files = [
      {
        path: "danger.js",
        content: `const k = "AKIAIOSFODNN7EXAMPLE";\n`,
        status: "added" as const,
      },
    ];
    const result = await runCheckPipeline({
      files,
      commits: [{ sha: "abc1234", message: "feat: x", author: "t", timestamp: new Date().toISOString() }],
      branch: "HEAD",
      repoFullName: "t/t",
      config,
    });
    const secrets = result.checks.find((c) => c.type === "secrets");
    expect(secrets).toBeDefined();
    expect(secrets!.status).toBe("warn");
    // Sanity: the engine still SEES the secret — it's just downgraded.
    expect(((secrets!.details as { findings?: unknown[] }).findings ?? []).length).toBeGreaterThan(0);
  });

  test("severity: fail (default) still hard-blocks a real AWS key", async () => {
    inTempCwd();
    writeFileSync(".lastgate.yml", `version: 1\nchecks:\n  secrets:\n    enabled: true\n    severity: fail\n`);
    const config = await loadConfig();
    const files = [
      {
        path: "danger.js",
        content: `const k = "AKIAIOSFODNN7EXAMPLE";\n`,
        status: "added" as const,
      },
    ];
    const result = await runCheckPipeline({
      files,
      commits: [{ sha: "abc1234", message: "feat: x", author: "t", timestamp: new Date().toISOString() }],
      branch: "HEAD",
      repoFullName: "t/t",
      config,
    });
    const secrets = result.checks.find((c) => c.type === "secrets");
    expect(secrets!.status).toBe("fail");
  });

  test("top-level allow silences findings in matched paths", async () => {
    inTempCwd();
    writeFileSync(
      ".lastgate.yml",
      `version: 1\nallow:\n  - "**/*.example"\nchecks:\n  secrets:\n    enabled: true\n    severity: fail\n`,
    );
    const config = await loadConfig();
    const files = [
      {
        path: ".env.example",
        content: `AWS_KEY=AKIAIOSFODNN7EXAMPLE\n`,
        status: "added" as const,
      },
    ];
    const result = await runCheckPipeline({
      files,
      commits: [{ sha: "abc1234", message: "feat: x", author: "t", timestamp: new Date().toISOString() }],
      branch: "HEAD",
      repoFullName: "t/t",
      config,
    });
    const secrets = result.checks.find((c) => c.type === "secrets");
    expect(secrets!.status).toBe("pass");
  });
});
