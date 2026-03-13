export interface FixSuggestionRequest {
  checkType: string;
  finding: {
    file: string;
    line?: number;
    message: string;
  };
  fileContent: string;
  surroundingLines: string;
  errorDetails: string;
}

export interface FixSuggestion {
  explanation: string;
  fix: string;
  confidence: "high" | "medium" | "low";
  alternatives?: string[];
}

export interface AiSuggestionsConfig {
  enabled: boolean;
  model: string;
  suggest_on: "fail" | "fail_and_warn" | "all";
  max_per_run: number;
  token_budget: number;
}

export interface AiUsageRecord {
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
}
