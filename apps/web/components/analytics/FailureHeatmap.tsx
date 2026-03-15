"use client";

import { useEffect, useState } from "react";
import { Card } from "@tremor/react";

interface DailyData {
  day: string;
  total: number;
  passed: number;
  failed: number;
  warned: number;
  passRate: number;
}

interface HeatmapDay {
  date: string;
  failures: number;
}

function HeatmapSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-5 w-32 bg-lg-surface-2 rounded animate-pulse" />
      <div className="flex gap-[3px] flex-wrap">
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-sm bg-lg-surface-2 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function FailureHeatmap({ range = "90d" }: { range?: string }) {
  const [data, setData] = useState<HeatmapDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/analytics?range=${range}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch analytics");
        return res.json();
      })
      .then((json) => {
        const daily: DailyData[] = json.dailyPassRate || [];
        const mapped: HeatmapDay[] = daily.map((d) => ({
          date: d.day,
          failures: d.failed,
        }));
        setData(mapped);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load heatmap data");
      })
      .finally(() => setLoading(false));
  }, [range]);

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

      {loading && <HeatmapSkeleton />}

      {!loading && error && (
        <div className="flex items-center justify-center h-24">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="flex items-center justify-center h-24">
          <div className="text-center">
            <p className="text-sm text-lg-text-muted">No failure data yet</p>
            <p className="text-xs text-lg-text-muted mt-1">
              The heatmap will fill in as checks run over time
            </p>
          </div>
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <>
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
        </>
      )}
    </Card>
  );
}
