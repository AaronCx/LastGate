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
  high: "text-emerald-600 bg-emerald-50",
  medium: "text-amber-600 bg-amber-50",
  low: "text-gray-600 bg-gray-100",
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
    <Card className="border-blue-200 bg-blue-50/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-700">
              AI Fix Suggestion
            </span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${confidenceColors[confidence]}`}
          >
            {confidence}
          </span>
        </div>

        <div className="text-xs text-gray-500">
          {checkType.toUpperCase()} &middot; {file}
          {line ? `:${line}` : ""}
        </div>

        <p className="text-sm text-gray-700">{explanation}</p>

        {fix && (
          <pre className="p-3 bg-gray-900 text-gray-200 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
            {fix}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
