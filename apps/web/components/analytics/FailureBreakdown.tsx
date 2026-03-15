"use client";

import { useEffect, useState } from "react";
import { Card, DonutChart, BarList } from "@tremor/react";

interface BreakdownEntry {
  checkType: string;
  count: number;
}

interface FailureBreakdownProps {
  data?: BreakdownEntry[];
  range?: string;
}

const CHECK_TYPE_LABELS: Record<string, string> = {
  secrets: "Secrets",
  lint: "Lint",
  build: "Build",
  duplicates: "Duplicates",
  file_patterns: "Files",
  commit_message: "Commit Msg",
  agent_patterns: "Agent",
  dependencies: "Deps",
};

function BreakdownSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-5 w-36 bg-lg-surface-2 rounded animate-pulse" />
      <div className="h-48 bg-lg-surface-2 rounded-full mx-auto w-48 animate-pulse" />
      <div className="space-y-2 mt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-3 flex-1 bg-lg-surface-2 rounded animate-pulse" />
            <div className="h-3 w-8 bg-lg-surface-2 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FailureBreakdown({ data: propData, range = "7d" }: FailureBreakdownProps) {
  const [fetchedData, setFetchedData] = useState<BreakdownEntry[] | null>(null);
  const [loading, setLoading] = useState(!propData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If data is passed as prop, use it directly
    if (propData) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/analytics?range=${range}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch analytics");
        return res.json();
      })
      .then((json) => {
        setFetchedData(json.topFailures || []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load breakdown data");
      })
      .finally(() => setLoading(false));
  }, [propData, range]);

  const rawData = propData || fetchedData || [];
  const chartData = rawData.map((d) => ({
    type: CHECK_TYPE_LABELS[d.checkType] || d.checkType,
    count: d.count,
  }));

  return (
    <Card className="!bg-lg-surface !border-lg-border !ring-0">
      <h3 className="font-sans font-semibold text-lg-text mb-4">
        Failure Breakdown
      </h3>

      {loading && <BreakdownSkeleton />}

      {!loading && error && (
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && chartData.length === 0 && (
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <p className="text-sm text-lg-text-muted">No failures to break down</p>
            <p className="text-xs text-lg-text-muted mt-1">
              All checks are passing
            </p>
          </div>
        </div>
      )}

      {!loading && !error && chartData.length > 0 && (
        <>
          <DonutChart
            data={chartData}
            category="count"
            index="type"
            colors={["red", "amber", "orange", "rose", "gray"]}
            valueFormatter={(v) => `${v} failures`}
            showAnimation={true}
            showTooltip={true}
            className="h-48"
            variant="donut"
          />
          <BarList
            data={chartData.map((d) => ({ name: d.type, value: d.count }))}
            className="mt-4"
            color="red"
            valueFormatter={(v: number) => `${v}`}
            showAnimation={true}
          />
        </>
      )}
    </Card>
  );
}
