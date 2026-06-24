"use client";

import { useState } from "react";
import { Card } from "@tremor/react";
import { Sparkles, Loader2 } from "lucide-react";
import AiSuggestion from "@/components/review/AiSuggestion";
import CostTracker from "@/components/analytics/CostTracker";

interface Suggestion {
  checkType: string;
  file: string;
  line: number | null;
  explanation: string;
  fix: string;
  confidence: "high" | "medium" | "low";
}
interface Usage {
  total_tokens: number;
  estimated_cost_usd: number;
}

export default function AiSuggestionsPanel({ runId }: { runId: string }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setNotConfigured(false);
    try {
      const res = await fetch(`/api/checks/${runId}/suggest`, { method: "POST" });
      const j = await res.json();
      if (j.configured === false) {
        setNotConfigured(true);
        return;
      }
      if (!res.ok) {
        setError(j.error || "Failed to generate suggestions");
        return;
      }
      setSuggestions(j.suggestions || []);
      setUsage(j.usage || null);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const count = suggestions?.length ?? 0;

  return (
    <Card className="!bg-lg-surface !border-lg-border !ring-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-lg-accent" />
          <h3 className="font-sans font-semibold text-lg-text">AI Fix Suggestions</h3>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-lg-accent/10 text-lg-accent px-3 py-1.5 text-sm font-medium hover:bg-lg-accent/20 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {suggestions ? "Regenerate" : "Generate suggestions"}
        </button>
      </div>

      {notConfigured ? (
        <p className="text-sm text-lg-text-muted">
          AI suggestions aren&apos;t configured on this deployment. Set{" "}
          <code className="font-mono">LASTGATE_LLM_BASE_URL</code> and{" "}
          <code className="font-mono">LASTGATE_LLM_MODEL</code> (e.g. a local Ollama, OpenAI, or
          any OpenAI-compatible endpoint) to enable them.
        </p>
      ) : null}

      {error ? <p className="text-sm text-lg-fail">{error}</p> : null}

      {usage ? (
        <div className="mb-4">
          <CostTracker
            totalTokens={usage.total_tokens}
            totalCost={usage.estimated_cost_usd}
            suggestionsCount={count}
            avgTokensPerSuggestion={Math.round(usage.total_tokens / Math.max(1, count))}
          />
        </div>
      ) : null}

      {suggestions ? (
        count > 0 ? (
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <AiSuggestion
                key={i}
                checkType={s.checkType}
                file={s.file}
                line={s.line ?? undefined}
                explanation={s.explanation}
                fix={s.fix}
                confidence={s.confidence}
              />
            ))}
          </div>
        ) : !notConfigured ? (
          <p className="text-sm text-lg-text-muted">No suggestions for this run.</p>
        ) : null
      ) : !notConfigured && !error ? (
        <p className="text-sm text-lg-text-muted">
          Generate AI-powered fix suggestions for this run&apos;s findings.
        </p>
      ) : null}
    </Card>
  );
}
