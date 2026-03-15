"use client";

import { useEffect, useState } from "react";
import { Card, AreaChart } from "@tremor/react";

interface DailyData {
  day: string;
  total: number;
  passed: number;
  failed: number;
  warned: number;
  passRate: number;
}

interface ChartRow {
  date: string;
  Passed: number;
  Failed: number;
  Warnings: number;
}

function ChartSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-48 bg-lg-surface-2 rounded animate-pulse" />
      <div className="h-72 bg-lg-surface-2 rounded animate-pulse" />
    </div>
  );
}

export default function CheckVolumeChart({ range = "7d" }: { range?: string }) {
  const [data, setData] = useState<ChartRow[]>([]);
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
        const mapped: ChartRow[] = daily.map((d) => ({
          date: new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          Passed: d.passed,
          Failed: d.failed,
          Warnings: d.warned,
        }));
        setData(mapped);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load chart data");
      })
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <Card className="!bg-lg-surface !border-lg-border !ring-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-sans font-semibold text-lg-text">
          Check Volume &amp; Pass Rate
        </h3>
      </div>

      {loading && <ChartSkeleton />}

      {!loading && error && (
        <div className="flex items-center justify-center h-72">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="flex items-center justify-center h-72">
          <div className="text-center">
            <p className="text-sm text-lg-text-muted">No check data yet</p>
            <p className="text-xs text-lg-text-muted mt-1">
              Check volume will appear here once commits are analyzed
            </p>
          </div>
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <AreaChart
          data={data}
          index="date"
          categories={["Passed", "Failed", "Warnings"]}
          colors={["emerald", "red", "amber"]}
          valueFormatter={(v) => `${v} checks`}
          showLegend={true}
          showGridLines={false}
          showAnimation={true}
          curveType="monotone"
          className="h-72"
        />
      )}
    </Card>
  );
}
