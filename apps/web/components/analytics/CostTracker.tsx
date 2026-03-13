"use client";

import { Card, CardContent } from "@/components/ui/card";

interface CostTrackerProps {
  totalTokens: number;
  totalCost: number;
  suggestionsCount: number;
  avgTokensPerSuggestion: number;
}

export default function CostTracker({
  totalTokens,
  totalCost,
  suggestionsCount,
  avgTokensPerSuggestion,
}: CostTrackerProps) {
  const stats = [
    {
      label: "Total Tokens",
      value: totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens.toString(),
    },
    {
      label: "Estimated Cost",
      value: `$${totalCost.toFixed(4)}`,
    },
    {
      label: "Suggestions",
      value: suggestionsCount.toString(),
    },
    {
      label: "Avg Tokens/Suggestion",
      value: avgTokensPerSuggestion.toString(),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="p-3 rounded-lg bg-gray-50 text-center">
          <p className="text-lg font-bold text-gray-900">{stat.value}</p>
          <p className="text-xs text-gray-500">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
