// Token cost estimates per model (USD per 1K tokens)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4o": { input: 0.005, output: 0.015 },
  "claude-haiku-4-5-20251001": { input: 0.0008, output: 0.004 },
  "claude-sonnet-4-6": { input: 0.003, output: 0.015 },
};

export function estimateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const costs = MODEL_COSTS[model] || MODEL_COSTS["gpt-4o-mini"];
  return (
    (promptTokens / 1000) * costs.input +
    (completionTokens / 1000) * costs.output
  );
}

export function isWithinBudget(
  currentTokens: number,
  budget: number
): boolean {
  return currentTokens < budget;
}

// Rough token estimation (4 chars per token on average)
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
