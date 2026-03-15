"use client";

import { useState } from "react";
import { Card, AreaChart } from "@tremor/react";

const data = [
  { date: "Mar 1", passRate: 85, checkCount: 15, failCount: 2 },
  { date: "Mar 2", passRate: 92, checkCount: 22, failCount: 2 },
  { date: "Mar 3", passRate: 78, checkCount: 21, failCount: 5 },
  { date: "Mar 4", passRate: 100, checkCount: 23, failCount: 0 },
  { date: "Mar 5", passRate: 91, checkCount: 33, failCount: 3 },
  { date: "Mar 6", passRate: 95, checkCount: 20, failCount: 1 },
  { date: "Mar 7", passRate: 93, checkCount: 28, failCount: 2 },
  { date: "Mar 8", passRate: 97, checkCount: 34, failCount: 1 },
  { date: "Mar 9", passRate: 90, checkCount: 31, failCount: 3 },
  { date: "Mar 10", passRate: 95, checkCount: 40, failCount: 2 },
  { date: "Mar 11", passRate: 100, checkCount: 30, failCount: 0 },
  { date: "Mar 12", passRate: 97, checkCount: 34, failCount: 1 },
  { date: "Mar 13", passRate: 95, checkCount: 42, failCount: 2 },
  { date: "Mar 14", passRate: 98, checkCount: 44, failCount: 1 },
];

const metrics = {
  passRate: { label: "Pass Rate %", color: "emerald" as const, format: (v: number) => `${v}%` },
  checkCount: { label: "Check Count", color: "blue" as const, format: (v: number) => `${v}` },
  failCount: { label: "Failures", color: "red" as const, format: (v: number) => `${v}` },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function PassRateTrend(_props?: { data?: any[] }) {
  const [metric, setMetric] = useState<keyof typeof metrics>("passRate");
  const m = metrics[metric];

  return (
    <Card className="!bg-lg-surface !border-lg-border !ring-0">
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
    </Card>
  );
}
