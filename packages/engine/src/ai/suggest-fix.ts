import type { FixSuggestionRequest, FixSuggestion, AiSuggestionsConfig, AiUsageRecord } from "./types";
import { buildPrompt } from "./prompts";
import { getCacheKey, getCachedSuggestion, cacheSuggestion } from "./cache";
import { estimateCost, isWithinBudget, estimateTokenCount } from "./cost";

export function getSurroundingLines(
  content: string,
  line: number,
  context: number = 10
): string {
  const lines = content.split("\n");
  const start = Math.max(0, line - context - 1);
  const end = Math.min(lines.length, line + context);
  return lines
    .slice(start, end)
    .map((l, i) => `${start + i + 1}: ${l}`)
    .join("\n");
}

export async function generateFixSuggestions(
  findings: FixSuggestionRequest[],
  config: AiSuggestionsConfig,
  apiCall?: (systemPrompt: string, userPrompt: string) => Promise<{ text: string; promptTokens: number; completionTokens: number }>
): Promise<{ suggestions: Map<string, FixSuggestion>; usage: AiUsageRecord }> {
  const suggestions = new Map<string, FixSuggestion>();
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalTokens = 0;

  // Limit suggestions per run
  const toProcess = findings.slice(0, config.max_per_run);

  for (const finding of toProcess) {
    // Check budget
    if (!isWithinBudget(totalTokens, config.token_budget)) break;

    // Check cache
    const cacheKey = getCacheKey(finding.checkType, finding.finding.file, finding.finding.message);
    const cached = getCachedSuggestion(cacheKey);
    if (cached) {
      suggestions.set(cacheKey, cached);
      continue;
    }

    if (!apiCall) {
      // No API call function provided — create a placeholder
      const placeholder: FixSuggestion = {
        explanation: `Fix needed for ${finding.checkType} issue in ${finding.finding.file}`,
        fix: "AI suggestions require an API key to be configured",
        confidence: "low",
      };
      suggestions.set(cacheKey, placeholder);
      cacheSuggestion(cacheKey, placeholder);
      continue;
    }

    try {
      const systemPrompt = buildPrompt(finding.checkType);
      const userPrompt = `Check type: ${finding.checkType}
File: ${finding.finding.file}${finding.finding.line ? ` (line ${finding.finding.line})` : ""}
Issue: ${finding.finding.message}

Surrounding code:
\`\`\`
${finding.surroundingLines}
\`\`\`

Error details: ${finding.errorDetails}`;

      const response = await apiCall(systemPrompt, userPrompt);

      const suggestion: FixSuggestion = parseSuggestion(response.text);
      suggestions.set(cacheKey, suggestion);
      cacheSuggestion(cacheKey, suggestion);

      totalPromptTokens += response.promptTokens;
      totalCompletionTokens += response.completionTokens;
      totalTokens += response.promptTokens + response.completionTokens;
    } catch (err) {
      // Skip failed suggestions
    }
  }

  const usage: AiUsageRecord = {
    model: config.model,
    prompt_tokens: totalPromptTokens,
    completion_tokens: totalCompletionTokens,
    total_tokens: totalTokens,
    estimated_cost_usd: estimateCost(config.model, totalPromptTokens, totalCompletionTokens),
  };

  return { suggestions, usage };
}

function parseSuggestion(text: string): FixSuggestion {
  // Simple heuristic parsing of LLM response
  const lines = text.split("\n");
  let explanation = "";
  let fix = "";
  let confidence: "high" | "medium" | "low" = "medium";

  let inCodeBlock = false;
  for (const line of lines) {
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      if (inCodeBlock) fix += "\n";
      continue;
    }
    if (inCodeBlock) {
      fix += line + "\n";
    } else if (!explanation && line.trim().length > 0) {
      explanation += line.trim() + " ";
    }
  }

  // Detect confidence from keywords
  if (text.toLowerCase().includes("definitely") || text.toLowerCase().includes("clearly")) {
    confidence = "high";
  } else if (text.toLowerCase().includes("might") || text.toLowerCase().includes("possibly")) {
    confidence = "low";
  }

  return {
    explanation: explanation.trim() || "See suggested fix below",
    fix: fix.trim() || text.trim(),
    confidence,
  };
}
