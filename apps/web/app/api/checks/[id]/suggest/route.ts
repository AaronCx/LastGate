import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireSession, unauthorizedResponse } from "@/lib/auth";
import { accessibleRepoIds } from "@/lib/ownership";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { buildLlmCall, getLlmModel, isLlmConfigured } from "@/lib/llm";
import {
  generateFixSuggestions,
  getCacheKey,
  type FixSuggestionRequest,
} from "@lastgate/engine";

export const dynamic = "force-dynamic";

/**
 * Generate AI fix suggestions for a check run's failed/warned findings.
 * Wires the (previously dead) engine suggestion pipeline + the AiSuggestion UI
 * to a configurable LLM (local Ollama, OpenAI, etc. — see lib/llm). Scoped to
 * the run's owner and rate-limited (LLM spend).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession(request);
  if (!session) return unauthorizedResponse();
  const { id: checkRunId } = await params;

  const supabase = createServerSupabaseClient();
  const repoIds = await accessibleRepoIds(session);
  const { data: run } = await supabase
    .from("check_runs")
    .select("id, repo_id")
    .eq("id", checkRunId)
    .maybeSingle();
  if (!run || !repoIds.includes(run.repo_id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isLlmConfigured()) {
    return NextResponse.json({
      configured: false,
      suggestions: [],
      message: "AI suggestions are not configured on this deployment.",
    });
  }

  // Bound LLM spend: 20 suggestion runs / hour / user.
  if (!(await rateLimit(`suggest:${session.id}`, 20, 3600))) return tooManyRequests();

  const { data: results } = await supabase
    .from("check_results")
    .select("check_type, status, details")
    .eq("check_run_id", checkRunId)
    .in("status", ["fail", "warn"]);

  const requests: FixSuggestionRequest[] = [];
  for (const r of results ?? []) {
    const findings =
      ((r.details as Record<string, unknown>)?.findings as Array<Record<string, unknown>>) || [];
    for (const f of findings) {
      const message = (f.message as string) || (f.pattern as string) || `${r.check_type} issue`;
      requests.push({
        checkType: r.check_type,
        finding: { file: (f.file as string) || "", line: f.line as number | undefined, message },
        fileContent: "",
        surroundingLines: "",
        errorDetails: message,
      });
    }
  }

  if (requests.length === 0) {
    return NextResponse.json({ configured: true, suggestions: [], usage: null });
  }

  const config = {
    enabled: true,
    model: getLlmModel(),
    suggest_on: "fail_and_warn" as const,
    max_per_run: 8,
    token_budget: 20000,
  };

  const { suggestions, usage } = await generateFixSuggestions(requests, config, buildLlmCall()!);

  // Map each finding to its suggestion via the engine's cache key.
  const out = requests
    .slice(0, config.max_per_run)
    .map((req) => {
      const key = getCacheKey(req.checkType, req.finding.file, req.finding.line, req.finding.message);
      const s = suggestions.get(key);
      if (!s) return null;
      return {
        checkType: req.checkType,
        file: req.finding.file,
        line: req.finding.line ?? null,
        explanation: s.explanation,
        fix: s.fix,
        confidence: s.confidence,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ configured: true, suggestions: out, usage });
}
