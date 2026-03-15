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
  passRate: number;
  checkCount: number;
  failCount: number;
}

const metrics = {
  passRate: { label: "Pass Rate %", color: "emerald" as const, format: (v: number) => `${v}%` },
  checkCount: { label: "Check Count", color: "blue" as const, format: (v: number) => `${v}` },
  failCount: { label: "Failures", color: "red" as const, format: (v: number) => `${v}` },
};

function ChartSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-5 w-40 bg-lg-surface-2 rounded animate-pulse" />
        <div className="flex gap-1">
          <div className="h-7 w-20 bg-lg-surface-2 rounded animate-pulse" />
          <div className="h-7 w-20 bg-lg-surface-2 rounded animate-pulse" />
          <div className="h-7 w-20 bg-lg-surface-2 rounded animate-pulse" />
        </div>
      </div>
      <div className="h-80 bg-lg-surface-2 rounded animate-pulse" />
    </div>
  );
}

export default function PassRateTrend({ range = "7d" }: { range?: string }) {
  const [data, setData] = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<keyof typeof metrics>("passRate");

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
          passRate: d.passRate,
          checkCount: d.total,
          failCount: d.failed,
        }));
        setData(mapped);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load trend data");
      })
      .finally(() => setLoading(false));
  }, [range]);

  const m = metrics[metric];

  return (
    <Card className="!bg-lg-surface !border-lg-border !ring-0">
      {loading ? (
        <ChartSkeleton />
      ) : error ? (
        <>
          <h3 className="font-sans font-semibold text-lg-text mb-4">
            Pass Rate Over Time
          </h3>
          <div className="flex items-center justify-center h-80">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </>
      ) : data.length === 0 ? (
        <>
          <h3 className="font-sans font-semibold text-lg-text mb-4">
            Pass Rate Over Time
          </h3>
          <div className="flex items-center justify-center h-80">
            <div className="text-center">
              <p className="text-sm text-lg-text-muted">No trend data yet</p>
              <p className="text-xs text-lg-text-muted mt-1">
                Pass rate trends will appear once checks start running
              </p>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-sans font-semibold text-lg-text">
              Pass Rate Over Time
            </h3>
            <div className="flex gap-1">
              {(Object.keys(metrics) as Array<keyof typeof metrics>).map((key) => (
                <button
                  key={key}
                  onClick={() => setMetric(key)}
                  className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${
                    metric === key
                      ? "bg-lg-accent/20 text-lg-accent"
                      : "text-lg-text-muted hover:text-lg-text hover:bg-lg-surface-2"
                  }`}
                >
                  {metrics[key].label}
                </button>
              ))}
            </div>
          </div>
          <AreaChart
            data={data}
            index="date"
            categories={[metric]}
            colors={[m.color]}
            valueFormatter={m.format}
            showLegend={false}
            showGridLines={false}
            showAnimation={true}
            curveType="monotone"
            className="h-80"
            yAxisWidth={48}
          />
        </>
      )}
    </Card>
  );
}
