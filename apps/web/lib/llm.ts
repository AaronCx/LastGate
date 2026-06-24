/**
 * Provider-agnostic LLM call for the AI fix-suggestion feature. Speaks the
 * OpenAI chat-completions shape, so it works with a LOCAL model (Ollama at
 * http://localhost:11434/v1 — no key needed), OpenAI, or any compatible gateway,
 * configured purely by env. Returns null when nothing is configured, so the
 * feature degrades gracefully (placeholder suggestions) instead of erroring.
 *
 *   LASTGATE_LLM_BASE_URL  e.g. http://localhost:11434/v1  (default: OpenAI)
 *   LASTGATE_LLM_MODEL     e.g. qwen2.5:7b-instruct        (default: gpt-4o-mini)
 *   LASTGATE_LLM_API_KEY   optional (omit for local Ollama)
 */
export type LlmCall = (
  systemPrompt: string,
  userPrompt: string,
) => Promise<{ text: string; promptTokens: number; completionTokens: number }>;

export function getLlmModel(): string {
  return process.env.LASTGATE_LLM_MODEL || "gpt-4o-mini";
}

export function isLlmConfigured(): boolean {
  return !!(process.env.LASTGATE_LLM_BASE_URL || process.env.LASTGATE_LLM_API_KEY);
}

export function buildLlmCall(): LlmCall | null {
  if (!isLlmConfigured()) return null;
  const base = (process.env.LASTGATE_LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const url = `${base}/chat/completions`;
  const apiKey = process.env.LASTGATE_LLM_API_KEY;
  const model = getLlmModel();

  return async (systemPrompt, userPrompt) => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 800,
      }),
    });
    if (!res.ok) {
      throw new Error(`LLM call failed (${res.status})`);
    }
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    const usage = data.usage ?? {};
    return {
      text,
      promptTokens: usage.prompt_tokens ?? 0,
      completionTokens: usage.completion_tokens ?? 0,
    };
  };
}
