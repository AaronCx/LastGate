"use client";

import { useEffect, useState } from "react";
import { Card, BarChart } from "@tremor/react";

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
  Warned: number;
}

function ChartSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-5 w-32 bg-lg-surface-2 rounded animate-pulse" />
      <div className="h-72 bg-lg-surface-2 rounded animate-pulse" />
    </div>
  );
}

export default function ChecksPerDay({ range = "7d" }: { range?: string }) {
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
          Warned: d.warned,
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
      <h3 className="font-sans font-semibold text-lg-text mb-4">
        Checks Per Day
      </h3>

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
              Daily check counts will appear once commits are analyzed
            </p>
          </div>
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <BarChart
          data={data}
          index="date"
          categories={["Passed", "Failed", "Warned"]}
          colors={["emerald", "red", "amber"]}
          valueFormatter={(v) => `${v}`}
          showLegend={true}
          showGridLines={false}
          showAnimation={true}
          stack={true}
          className="h-72"
        />
      )}
    </Card>
  );
}
