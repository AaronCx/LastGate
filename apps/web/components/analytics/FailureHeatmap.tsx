"use client";

import { cn } from "@/lib/utils";

interface DailyData {
  day: string;
  failed: number;
}

interface FailureHeatmapProps {
  data: DailyData[];
}

function getIntensity(count: number, max: number): string {
  if (count === 0) return "bg-gray-100";
  const ratio = count / Math.max(max, 1);
  if (ratio > 0.75) return "bg-red-500";
  if (ratio > 0.5) return "bg-red-400";
  if (ratio > 0.25) return "bg-red-300";
  return "bg-red-200";
}

export default function FailureHeatmap({ data }: FailureHeatmapProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400">
        No failure data for this period
      </div>
    );
  }

  const maxFailed = Math.max(...data.map((d) => d.failed), 1);

  // Group by week (rows) with days as columns
  const weeks: DailyData[][] = [];
  let currentWeek: DailyData[] = [];

  // Pad start to align with day of week
  const firstDay = new Date(data[0].day + "T00:00:00").getDay();
  for (let i = 0; i < firstDay; i++) {
    currentWeek.push({ day: "", failed: -1 });
  }

  for (const d of data) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  return (
    <div className="space-y-3">
      <div className="flex gap-0.5 flex-wrap">
        {data.map((d) => (
          <div
            key={d.day}
            title={`${d.day}: ${d.failed} failure${d.failed !== 1 ? "s" : ""}`}
            className={cn(
              "w-3.5 h-3.5 rounded-sm transition-colors",
              getIntensity(d.failed, maxFailed)
            )}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-gray-100" />
        <div className="w-3 h-3 rounded-sm bg-red-200" />
        <div className="w-3 h-3 rounded-sm bg-red-300" />
        <div className="w-3 h-3 rounded-sm bg-red-400" />
        <div className="w-3 h-3 rounded-sm bg-red-500" />
        <span>More</span>
      </div>
    </div>
  );
}
