"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface AiSuggestionProps {
  checkType: string;
  file: string;
  line?: number;
  explanation: string;
  fix: string;
  confidence: "high" | "medium" | "low";
}

const confidenceColors = {
  high: "text-lg-pass bg-emerald-500/10",
  medium: "text-lg-warn bg-amber-500/10",
  low: "text-lg-text-secondary bg-lg-surface-2",
};

export default function AiSuggestion({
  checkType,
  file,
  line,
  explanation,
  fix,
  confidence,
}: AiSuggestionProps) {
  return (
    <Card className="!bg-lg-surface !border-lg-accent/20 !ring-0">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-lg-accent" />
            <span className="text-sm font-medium text-lg-accent">
              AI Fix Suggestion
            </span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${confidenceColors[confidence]}`}
          >
            {confidence}
          </span>
        </div>

        <div className="text-xs text-lg-text-muted">
          {checkType.toUpperCase()} &middot; {file}
          {line ? `:${line}` : ""}
        </div>

        <p className="text-sm text-lg-text-secondary">{explanation}</p>

        {fix && (
          <pre className="p-3 bg-gray-900 text-gray-200 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
            {fix}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
