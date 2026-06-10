import { describe, test, expect } from "bun:test";
import {
  extractSecretsToEnv,
  updateEnvExample,
  findHardcodedSecrets,
} from "../fixers/secrets";
import { planAutoFixes } from "../index";
import type { AutoFixConfig } from "../types";

const config: AutoFixConfig = {
  enabled: true,
  fixes: {
    remove_blocked_files: false,
    update_gitignore: false,
    trailing_whitespace: false,
    eof_newline: false,
    linter_autofix: false,
    extract_secrets: true,
  },
  protected_branches: ["main", "production"],
  require_approval: false,
};

describe("extractSecretsToEnv — oracle cases", () => {
  test("rewrites a TS assignment to process.env with a derived name", () => {
    const src = `const apiKey = "sk_live_abc123";\nconst x = 1;\n`;
    const r = extractSecretsToEnv(src, "config.ts", [1]);
    expect(r.content).toBe(`const apiKey = process.env.API_KEY;\nconst x = 1;\n`);
    expect(r.envKeys).toEqual(["API_KEY"]);
    expect(r.skippedLines).toEqual([]);
  });

  test("rewrites a Python assignment to os.environ", () => {
    const src = `stripe_key = "sk_live_xyz"\n`;
    const r = extractSecretsToEnv(src, "settings.py", [1]);
    expect(r.content).toBe(`stripe_key = os.environ["STRIPE_KEY"]\n`);
    expect(r.envKeys).toEqual(["STRIPE_KEY"]);
  });

  test("handles a JSON-style quoted key", () => {
    const src = `{\n  "awsSecret": "AKIAEXAMPLE"\n}\n`;
    const r = extractSecretsToEnv(src, "conf.js", [2]);
    expect(r.content).toContain("process.env.AWS_SECRET");
    expect(r.envKeys).toEqual(["AWS_SECRET"]);
  });

  test("falls back to SECRET_<line> when no identifier precedes the literal", () => {
    const src = `someFn("hardcoded-token")\n`;
    const r = extractSecretsToEnv(src, "a.ts", [1]);
    expect(r.content).toBe(`someFn(process.env.SECRET_1)\n`);
    expect(r.envKeys).toEqual(["SECRET_1"]);
  });

  test("only rewrites the flagged line, not other string literals", () => {
    const src = `const safe = "ok";\nconst token = "secret";\n`;
    const r = extractSecretsToEnv(src, "a.ts", [2]);
    expect(r.content).toBe(`const safe = "ok";\nconst token = process.env.TOKEN;\n`);
  });

  test("skips lines with no string literal", () => {
    const src = `const n = 42;\n`;
    const r = extractSecretsToEnv(src, "a.ts", [1]);
    expect(r.content).toBe(src);
    expect(r.skippedLines).toEqual([1]);
  });

  test("idempotent: re-running on already-extracted content is a no-op", () => {
    const src = `const apiKey = "sk_live_abc";\n`;
    const once = extractSecretsToEnv(src, "a.ts", [1]);
    const twice = extractSecretsToEnv(once.content, "a.ts", [1]);
    // second pass finds no string literal on the line → unchanged
    expect(twice.content).toBe(once.content);
    expect(twice.skippedLines).toEqual([1]);
  });

  test("unknown file type cannot be rewritten safely", () => {
    const src = `secret = "value"\n`;
    const r = extractSecretsToEnv(src, "data.bin", [1]);
    expect(r.content).toBe(src);
    expect(r.envKeys).toEqual([]);
    expect(r.skippedLines).toEqual([1]);
  });
});

describe("updateEnvExample", () => {
  test("appends new keys with empty placeholders", () => {
    expect(updateEnvExample("", ["API_KEY", "DB_URL"])).toBe("API_KEY=\nDB_URL=\n");
  });

  test("does not duplicate already-declared keys", () => {
    const current = "API_KEY=\n";
    expect(updateEnvExample(current, ["API_KEY"])).toBeNull();
    expect(updateEnvExample(current, ["API_KEY", "NEW"])).toBe("API_KEY=\nNEW=\n");
  });

  test("preserves existing content and trailing newline handling", () => {
    expect(updateEnvExample("EXISTING=", ["NEW"])).toBe("EXISTING=\nNEW=\n");
  });
});

describe("findHardcodedSecrets — planning", () => {
  test("emits one action per file with extractable secrets", () => {
    const files = [
      { path: "config.ts", content: 'const k = "x";\n', status: "modified" },
      { path: "data.bin", content: 'k="x"\n', status: "added" },
    ];
    const actions = findHardcodedSecrets(files, [
      { file: "config.ts", line: 1 },
      { file: "config.ts", line: 1 },
      { file: "data.bin", line: 1 },
    ]);
    // config.ts is extractable (2 findings), data.bin is not a known type
    expect(actions.length).toBe(1);
    expect(actions[0].type).toBe("extract_secret");
    expect(actions[0].description).toContain("2 hardcoded secrets");
  });
});

describe("planAutoFixes — secrets wiring", () => {
  test("includes extract_secret actions when locations are supplied", () => {
    const files = [{ path: "config.ts", content: 'const k = "x";\n', status: "modified" }];
    const result = planAutoFixes(files, "feature/x", config, {
      secretLocations: [{ file: "config.ts", line: 1 }],
    });
    expect(result.applied.some((a) => a.type === "extract_secret")).toBe(true);
  });

  test("string 4th arg is still treated as gitignore (back-compat)", () => {
    const result = planAutoFixes([], "feature/x", config, "node_modules/\n");
    expect(result.error).toBeUndefined();
  });
});
