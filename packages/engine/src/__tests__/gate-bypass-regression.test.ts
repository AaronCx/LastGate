import { describe, it, expect } from "bun:test";
import { runCheckPipeline, type PipelineInput } from "../pipeline";
import { parseConfig } from "../config/parser";
import { parseAddedLines } from "../diff/parse";
import { checkFilePatterns } from "../checks/file-patterns";
import type { ChangedFile, PipelineConfig } from "../types";

// ---------------------------------------------------------------------------
// Adversarial gate-bypass corpus.
//
// Each test here encodes a concrete way a bad diff was able to slip past the
// gate (from the security audit). They are written to FAIL against the
// pre-fix engine and PASS once the corresponding fix lands, so the gate's core
// promise — "block bad diffs, pass good ones" — stays enforced.
// ---------------------------------------------------------------------------

function file(path: string, content: string, status: ChangedFile["status"] = "added"): ChangedFile {
  return { path, content, status };
}

function input(over: Partial<PipelineInput>): PipelineInput {
  return { files: [], commits: [], branch: "feature/x", repoFullName: "owner/repo", ...over };
}

// A real-shaped hardcoded credential the named scanners must catch.
const AWS_KEY_FILE = file("config.ts", 'const key = "AKIAIOSFODNN7EXAMPLE";');

describe("C5: a partial caller config must not disable/downgrade other checks", () => {
  it("keeps secrets running at blocking severity when only an unrelated check is set", async () => {
    // Pre-fix: shallow `{...defaults, ...config}` replaced the whole `checks`
    // object, so secrets vanished (or lost its severity → warn) and the AWS key
    // merged clean.
    const res = await runCheckPipeline(
      input({
        files: [AWS_KEY_FILE],
        config: { checks: { duplicates: { enabled: false } } } as Partial<PipelineConfig>,
      }),
    );

    const secrets = res.checks.find((c) => c.type === "secrets");
    expect(secrets).toBeDefined();
    expect(secrets!.status).toBe("fail"); // not silently downgraded to "warn"
    expect(res.hasFailures).toBe(true);
  });

  it("a partial secrets block keeps the default blocking severity", async () => {
    const res = await runCheckPipeline(
      input({
        files: [AWS_KEY_FILE],
        // user only tweaks the entropy threshold; severity must stay the default "fail"
        config: { checks: { secrets: { enabled: true, entropy_threshold: 4.0 } } } as Partial<PipelineConfig>,
      }),
    );
    const secrets = res.checks.find((c) => c.type === "secrets")!;
    expect(secrets.status).toBe("fail");
  });
});

describe("C1/allow: an unbounded allow glob can no longer neutralize the gate", () => {
  for (const glob of ["**", "**/*", "*", "**/**"]) {
    it(`rejects top-level allow: ['${glob}'] at parse time`, () => {
      expect(() => parseConfig(`allow:\n  - "${glob}"\n`)).toThrow();
    });
    it(`rejects secrets.allow: ['${glob}'] at parse time`, () => {
      expect(() => parseConfig(`checks:\n  secrets:\n    allow:\n      - "${glob}"\n`)).toThrow();
    });
  }

  it("still accepts a concrete allow prefix", () => {
    const cfg = parseConfig(`allow:\n  - "test/fixtures/**"\n`);
    expect(cfg.allow).toEqual(["test/fixtures/**"]);
  });
});

describe("extends: schema defaults must not clobber a pack value the user never set", () => {
  it("keeps the pack's commit_message.enabled=false when the user only changes severity", () => {
    // solo-dev disables commit_message; the user tweaks an unrelated sibling field.
    const cfg = parseConfig(
      ["extends:", "  - solo-dev", "checks:", "  commit_message:", "    severity: fail"].join("\n"),
    );
    // Pre-fix: validateConfig(localRaw) injected the schema default enabled:true
    // into the top layer, re-enabling the check the pack turned off.
    expect(cfg.checks.commit_message?.enabled).toBe(false);
    expect(cfg.checks.commit_message?.require_conventional).toBe(false);
    // the user's explicit change still applies
    expect(cfg.checks.commit_message?.severity).toBe("fail");
  });

  it("keeps the pack's build.enabled=false when the user sets only build.command", () => {
    const cfg = parseConfig(
      ["extends:", "  - solo-dev", "checks:", "  build:", "    command: 'make'"].join("\n"),
    );
    expect(cfg.checks.build?.enabled).toBe(false);
  });
});

describe("diff parser: an added line starting with '++ ' / '-- ' cannot truncate the hunk", () => {
  it("still emits added lines that follow a '+++ '-prefixed added line", () => {
    // Raw added content "++ not metadata" renders as a diff line "+++ not metadata".
    const patch = [
      "diff --git a/f.ts b/f.ts",
      "index 000..111 100644",
      "--- a/f.ts",
      "+++ b/f.ts",
      "@@ -1,0 +1,3 @@",
      "+++ not metadata, this is added content",
      '+const key = "AKIAIOSFODNN7EXAMPLE";',
      "+another added line",
    ].join("\n");

    const added = parseAddedLines(patch);
    const texts = added.map((a) => a.text);
    expect(texts).toContain('const key = "AKIAIOSFODNN7EXAMPLE";');
    expect(texts.some((t) => t.includes("another added line"))).toBe(true);
  });
});

describe("file_patterns: default artifact globs catch nested monorepo copies", () => {
  it("blocks a dist/ file nested under a sub-package", async () => {
    const res = await checkFilePatterns(
      [file("packages/app/dist/bundle.js", "console.log(1)")],
      { enabled: true, severity: "fail" },
    );
    expect(res.status).toBe("fail");
  });

  it("blocks nested node_modules and .next artifacts too", async () => {
    const res = await checkFilePatterns(
      [
        file("apps/web/node_modules/dep/index.js", "x"),
        file("services/api/.next/cache/x", "y"),
      ],
      { enabled: true, severity: "fail" },
    );
    expect((res.details.count as number)).toBeGreaterThanOrEqual(2);
  });

  it("does not flag a legitimately-named file that merely contains 'dist'", async () => {
    const res = await checkFilePatterns(
      [file("src/redistribute.ts", "export const x = 1")],
      { enabled: true, severity: "fail" },
    );
    expect(res.status).toBe("pass");
  });
});
