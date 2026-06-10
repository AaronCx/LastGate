import type {
  AddedLine,
  ChangedFile,
  CheckResult,
  CheckStatus,
  FindingSeverity,
  SemanticCheckConfig,
} from "../types";
import { parseAddedLines } from "../diff/parse";
import { statusFromFindings } from "./status";
import { buildSemanticPrompt } from "../ai/prompts";
import { estimateTokenCount, estimateCost, isWithinBudget } from "../ai/cost";
import {
  getSemanticCacheKey,
  getCachedSemanticReview,
  cacheSemanticReview,
  type CachedSemanticReview,
} from "../ai/cache";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_TOKEN_BUDGET = 20_000;

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".svg", ".webp",
  ".mp3", ".mp4", ".wav", ".avi", ".mov", ".mkv", ".webm",
  ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar", ".xz",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".exe", ".dll", ".so", ".dylib", ".bin",
  ".pyc", ".pyo", ".class", ".o", ".obj",
  ".sqlite", ".db", ".lock",
]);

function isBinaryFile(filename: string): boolean {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return false;
  return BINARY_EXTENSIONS.has(filename.slice(dot).toLowerCase());
}

function addedLinesFromFullContent(content: string): AddedLine[] {
  if (!content) return [];
  return content.split("\n").map((text, i) => ({ lineNo: i + 1, text }));
}

export interface SemanticFinding {
  file: string;
  line: number;
  rule: string;
  message: string;
  severity: FindingSeverity;
}

/**
 * The LLM call, injected so tests can supply a deterministic fake. The default implementation is
 * wired by callers (CLI / webhook) that own the API client + key — the engine never embeds one.
 * Returning a usage record lets the check track the token budget and estimated cost.
 */
export type SemanticReviewCall = (
  systemPrompt: string,
  userPrompt: string,
) => Promise<{ text: string; promptTokens: number; completionTokens: number }>;

/**
 * Optional context for the semantic tier. `priorResults` lets the check honor `run_only_on_clean`:
 * the pipeline passes the results of the static tiers that ran before it.
 */
export interface SemanticContext {
  /** Injected LLM call. When absent, the check fails open (pass with skipped note). */
  reviewCall?: SemanticReviewCall;
  /** Results of static checks that ran before the semantic tier. */
  priorResults?: CheckResult[];
}

function skipped(summary: string, reason: string): CheckResult {
  return {
    type: "semantic",
    status: "pass",
    title: "Semantic Review",
    summary,
    details: { skipped: true, reason, findings: [] },
  };
}

function buildDiffPayload(files: ChangedFile[]): { payload: string; lineCount: number } {
  const blocks: string[] = [];
  let lineCount = 0;

  for (const file of files) {
    if (file.status === "removed") continue;
    if (isBinaryFile(file.path)) continue;

    const scanLines: AddedLine[] = file.addedLines
      ?? (file.patch ? parseAddedLines(file.patch) : addedLinesFromFullContent(file.content));
    if (scanLines.length === 0) continue;

    const body = scanLines.map(({ lineNo, text }) => `${lineNo}: ${text}`).join("\n");
    blocks.push(`### ${file.path}\n${body}`);
    lineCount += scanLines.length;
  }

  return { payload: blocks.join("\n\n"), lineCount };
}

function parseFindings(text: string): SemanticFinding[] {
  // The model is asked for a bare JSON array, but be defensive: extract the first JSON array
  // even if it's wrapped in prose or a fenced code block.
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return [];

  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];

  const allowedSeverity = new Set<FindingSeverity>(["critical", "high", "medium", "low"]);
  const findings: SemanticFinding[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const file = typeof o.file === "string" ? o.file : undefined;
    const message = typeof o.message === "string" ? o.message : undefined;
    if (!file || !message) continue;
    const severity = allowedSeverity.has(o.severity as FindingSeverity)
      ? (o.severity as FindingSeverity)
      : "medium";
    findings.push({
      file,
      line: typeof o.line === "number" && Number.isFinite(o.line) ? o.line : 0,
      rule: typeof o.rule === "string" && o.rule.length > 0 ? o.rule : "semantic-issue",
      message,
      severity,
    });
  }
  return findings;
}

/**
 * Semantic review tier. Runs the added lines through an LLM against a per-repo policy prompt.
 *
 * Guarantees:
 *  - Fails OPEN. No injected reviewCall (no model/key wired) → pass + skipped note. Any LLM error
 *    → pass + skipped note. The PR is never blocked because the LLM was unavailable.
 *  - run_only_on_clean (default true): short-circuits to pass unless every prior static tier passed.
 *  - Cost-bounded: skips the call when the diff payload alone exceeds the token budget.
 *  - Cached by hash of (diff payload + policy + model) — an identical diff never re-bills the LLM.
 *  - Findings default to warn (statusFromFindings caps medium/low at warn regardless of severity).
 */
export async function checkSemantic(
  files: ChangedFile[],
  config: SemanticCheckConfig,
  context?: SemanticContext,
): Promise<CheckResult> {
  // On Vercel serverless there are no LLM creds and the repo isn't checked out — skip cleanly.
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return skipped(
      "Semantic review skipped (serverless environment)",
      "serverless environment — no LLM credentials available",
    );
  }

  const runOnlyOnClean = config.run_only_on_clean ?? true;
  if (runOnlyOnClean && context?.priorResults?.some((r) => r.status === "fail")) {
    return skipped(
      "Semantic review skipped — static checks failed (run_only_on_clean)",
      "prior static tier failed; not spending tokens until statics pass",
    );
  }

  const reviewCall = context?.reviewCall;
  if (!reviewCall) {
    // Fail open: no model/API key wired.
    return skipped(
      "Semantic review skipped (no model configured)",
      "no LLM client configured — semantic tier is opt-in and fails open",
    );
  }

  const { payload, lineCount } = buildDiffPayload(files);
  if (lineCount === 0) {
    return skipped("Semantic review skipped (no added lines to review)", "no reviewable added lines in diff");
  }

  const model = config.model ?? DEFAULT_MODEL;
  const tokenBudget = config.token_budget ?? DEFAULT_TOKEN_BUDGET;
  const policy = config.policy ?? "";
  const systemPrompt = buildSemanticPrompt(policy);
  const userPrompt = `Review the following added lines. Each line is prefixed with its new-file line number.\n\n${payload}`;

  // Cost guard: if the prompt alone blows the budget, don't even make the call.
  const promptTokens = estimateTokenCount(systemPrompt) + estimateTokenCount(userPrompt);
  if (!isWithinBudget(promptTokens, tokenBudget)) {
    return skipped(
      `Semantic review skipped — diff exceeds token budget (${promptTokens} > ${tokenBudget})`,
      "estimated prompt tokens exceed configured token_budget",
    );
  }

  // Cache by (diff payload + policy + model). Identical PR diffs reuse the prior verdict for free.
  const cacheKey = getSemanticCacheKey(payload, policy, model);
  const cached = getCachedSemanticReview(cacheKey);
  if (cached) {
    return buildResult(cached.findings, config, { cached: true, model, tokenBudget });
  }

  let response: { text: string; promptTokens: number; completionTokens: number };
  try {
    response = await reviewCall(systemPrompt, userPrompt);
  } catch (err) {
    // Fail open on any LLM error.
    return skipped(
      "Semantic review skipped (LLM error)",
      `LLM call failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const findings = parseFindings(response.text);
  const review: CachedSemanticReview = { findings };
  cacheSemanticReview(cacheKey, review);

  const totalTokens = response.promptTokens + response.completionTokens;
  return buildResult(findings, config, {
    cached: false,
    model,
    tokenBudget,
    promptTokens: response.promptTokens,
    completionTokens: response.completionTokens,
    totalTokens,
    estimatedCostUsd: estimateCost(model, response.promptTokens, response.completionTokens),
  });
}

function buildResult(
  findings: SemanticFinding[],
  config: SemanticCheckConfig,
  extra: Record<string, unknown>,
): CheckResult {
  // Findings default to warn: statusFromFindings caps medium/low at warn, and the config default
  // severity is "warn", so a semantic finding never hard-blocks unless the repo explicitly opts a
  // high/critical finding into "fail" via config.severity.
  const status: CheckStatus = statusFromFindings(findings, { severity: config.severity });

  const summary = findings.length === 0
    ? "Semantic review found no issues"
    : `Semantic review flagged ${findings.length} issue(s)`;

  return {
    type: "semantic",
    status,
    title: "Semantic Review",
    summary,
    details: {
      findings,
      count: findings.length,
      ...extra,
    },
  };
}
