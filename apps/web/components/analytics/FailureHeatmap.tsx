"use client";

import { Card } from "@tremor/react";

function generateData(days: number) {
  const data: Array<{ date: string; failures: number }> = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    // Simulate: most days 0, some days 1-3, rare days 4+
    const rand = Math.random();
    const failures = rand < 0.5 ? 0 : rand < 0.75 ? 1 : rand < 0.9 ? 2 : Math.floor(Math.random() * 5) + 3;
    data.push({ date: dateStr, failures });
  }
  return data;
}

export default function FailureHeatmap({ days = 90 }: { days?: number }) {
  const data = generateData(days);
  const maxFailures = Math.max(...data.map((d) => d.failures), 1);

  function getColor(failures: number): string {
    if (failures === 0) return "bg-lg-surface-2";
    const intensity = failures / maxFailures;
    if (intensity < 0.25) return "bg-red-900/40";
    if (intensity < 0.5) return "bg-red-700/60";
    if (intensity < 0.75) return "bg-red-500/80";
    return "bg-red-500";
  }

  return (
    <Card className="!bg-lg-surface !border-lg-border !ring-0">
      <h3 className="font-sans font-semibold text-lg-text mb-4">
        Failure Heatmap
      </h3>
      <div className="flex gap-[3px] flex-wrap">
        {data.map((day) => (
          <div
            key={day.date}
            className={`w-3 h-3 rounded-sm ${getColor(day.failures)}
                       hover:ring-2 hover:ring-lg-accent transition-all cursor-pointer`}
            title={`${day.date}: ${day.failures} failure${day.failures !== 1 ? "s" : ""}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[10px] text-lg-text-muted">Less</span>
        <div className="w-3 h-3 rounded-sm bg-lg-surface-2" />
        <div className="w-3 h-3 rounded-sm bg-red-900/40" />
        <div className="w-3 h-3 rounded-sm bg-red-700/60" />
        <div className="w-3 h-3 rounded-sm bg-red-500/80" />
        <div className="w-3 h-3 rounded-sm bg-red-500" />
        <span className="text-[10px] text-lg-text-muted">More</span>
      </div>
    </Card>
  );
}
