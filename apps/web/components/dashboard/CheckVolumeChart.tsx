"use client";

import { Card, AreaChart } from "@tremor/react";

const data = [
  { date: "Mar 1", Passed: 12, Failed: 2, Warnings: 1 },
  { date: "Mar 2", Passed: 18, Failed: 1, Warnings: 3 },
  { date: "Mar 3", Passed: 15, Failed: 4, Warnings: 2 },
  { date: "Mar 4", Passed: 22, Failed: 0, Warnings: 1 },
  { date: "Mar 5", Passed: 28, Failed: 3, Warnings: 2 },
  { date: "Mar 6", Passed: 19, Failed: 1, Warnings: 0 },
  { date: "Mar 7", Passed: 25, Failed: 2, Warnings: 1 },
  { date: "Mar 8", Passed: 31, Failed: 1, Warnings: 2 },
  { date: "Mar 9", Passed: 27, Failed: 3, Warnings: 1 },
  { date: "Mar 10", Passed: 35, Failed: 2, Warnings: 3 },
  { date: "Mar 11", Passed: 29, Failed: 0, Warnings: 1 },
  { date: "Mar 12", Passed: 33, Failed: 1, Warnings: 0 },
  { date: "Mar 13", Passed: 38, Failed: 2, Warnings: 2 },
  { date: "Mar 14", Passed: 42, Failed: 1, Warnings: 1 },
];

export default function CheckVolumeChart() {
  return (
    <Card className="!bg-lg-surface !border-lg-border !ring-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-sans font-semibold text-lg-text">
          Check Volume &amp; Pass Rate
        </h3>
      </div>
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
    </Card>
  );
}
