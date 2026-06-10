import type { FixAction } from "../types";

/** A secret finding the fixer can act on: which file, which line. */
export interface SecretLocation {
  file: string;
  line: number;
}

/** Result of rewriting one file's hardcoded secrets. */
export interface SecretExtraction {
  /** The file content with secret literals replaced by env references. */
  content: string;
  /** Env var names introduced, for the .env.example entry. */
  envKeys: string[];
  /** Lines that couldn't be rewritten (no string literal found), 1-based. */
  skippedLines: number[];
}

const EXT_RENDERERS: Record<string, (name: string) => string> = {
  ts: (n) => `process.env.${n}`,
  tsx: (n) => `process.env.${n}`,
  js: (n) => `process.env.${n}`,
  jsx: (n) => `process.env.${n}`,
  mjs: (n) => `process.env.${n}`,
  cjs: (n) => `process.env.${n}`,
  py: (n) => `os.environ["${n}"]`,
  rb: (n) => `ENV["${n}"]`,
  go: (n) => `os.Getenv("${n}")`,
  yml: (n) => `\${${n}}`,
  yaml: (n) => `\${${n}}`,
};

function extOf(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot + 1).toLowerCase();
}

/**
 * Last string literal (single/double/backtick quoted) on a line, with its
 * bounds. The secret is the assigned value, so in `KEY: "secret"` or
 * `key = "secret"` the value is the rightmost literal, not the key.
 */
function findStringLiteral(line: string): { start: number; end: number } | null {
  const re = /(['"`])(?:\\.|(?!\1).)*\1/g;
  let last: RegExpExecArray | null = null;
  for (let m = re.exec(line); m !== null; m = re.exec(line)) last = m;
  if (!last) return null;
  return { start: last.index, end: last.index + last[0].length };
}

/**
 * Derive an env var name from the assignment to the left of the literal:
 * `apiKey = "..."` → API_KEY, `"stripe_key": "..."` → STRIPE_KEY.
 * Falls back to SECRET_<line> when no identifier precedes the literal.
 */
function deriveEnvName(line: string, literalStart: number, lineNo: number): string {
  const before = line.slice(0, literalStart);
  // last identifier before an `=` or `:` separator
  const m = before.match(/([A-Za-z_][A-Za-z0-9_]*)\s*['"`]?\s*[:=]\s*['"`]?\s*$/);
  if (m) {
    const snake = m[1]
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2") // camelCase → camel_Case
      .replace(/[^A-Za-z0-9]+/g, "_")
      .toUpperCase()
      .replace(/^_+|_+$/g, "");
    if (snake) return snake;
  }
  return `SECRET_${lineNo}`;
}

/** Plan: one FixAction per file that has extractable hardcoded secrets. */
export function findHardcodedSecrets(
  files: { path: string; content: string; status: string }[],
  locations: SecretLocation[],
): FixAction[] {
  const actions: FixAction[] = [];
  const byFile = new Map<string, number>();
  for (const loc of locations) byFile.set(loc.file, (byFile.get(loc.file) ?? 0) + 1);

  for (const file of files) {
    if (file.status === "deleted" || !file.content) continue;
    const count = byFile.get(file.path);
    if (!count) continue;
    if (!(extOf(file.path) in EXT_RENDERERS)) continue; // can't safely rewrite unknown types
    actions.push({
      type: "extract_secret",
      file: file.path,
      description: `Move ${count} hardcoded secret${count === 1 ? "" : "s"} in ${file.path} to environment variables`,
    });
  }
  return actions;
}

/**
 * Rewrite hardcoded secrets on the given lines to env references and collect
 * the env var names for the .env.example entry. Deterministic and idempotent:
 * a line whose literal is already an env reference is left untouched.
 */
export function extractSecretsToEnv(
  content: string,
  filePath: string,
  lines: number[],
): SecretExtraction {
  const render = EXT_RENDERERS[extOf(filePath)];
  if (!render) return { content, envKeys: [], skippedLines: [...lines] };

  const out = content.split("\n");
  const envKeys: string[] = [];
  const skippedLines: number[] = [];
  const targets = new Set(lines);

  for (const lineNo of targets) {
    const idx = lineNo - 1;
    if (idx < 0 || idx >= out.length) {
      skippedLines.push(lineNo);
      continue;
    }
    const line = out[idx];
    const lit = findStringLiteral(line);
    if (!lit) {
      skippedLines.push(lineNo);
      continue;
    }
    const name = deriveEnvName(line, lit.start, lineNo);
    const replacement = render(name);
    out[idx] = line.slice(0, lit.start) + replacement + line.slice(lit.end);
    if (!envKeys.includes(name)) envKeys.push(name);
  }

  return { content: out.join("\n"), envKeys, skippedLines };
}

/**
 * Merge new env keys into an existing .env.example, appending only keys that
 * aren't already declared. Returns the updated file content (with trailing
 * newline) or null when there's nothing to add.
 */
export function updateEnvExample(current: string, envKeys: string[]): string | null {
  const declared = new Set(
    current
      .split("\n")
      .map((l) => l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => m[1]),
  );
  const additions = envKeys.filter((k) => !declared.has(k));
  if (additions.length === 0) return null;

  const base = current.length === 0 || current.endsWith("\n") ? current : current + "\n";
  return base + additions.map((k) => `${k}=`).join("\n") + "\n";
}
