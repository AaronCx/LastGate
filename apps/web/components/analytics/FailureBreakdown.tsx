"use client";

import { Card, DonutChart, BarList } from "@tremor/react";

const defaultData = [
  { type: "Secrets", count: 34 },
  { type: "Lint", count: 28 },
  { type: "Build", count: 18 },
  { type: "Files", count: 12 },
  { type: "Other", count: 8 },
];

interface BreakdownEntry {
  checkType: string;
  count: number;
}

interface FailureBreakdownProps {
  data?: BreakdownEntry[];
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

export default function FailureBreakdown({ data: propData }: FailureBreakdownProps = {}) {
  const chartData = propData
    ? propData.map((d) => ({
        type: CHECK_TYPE_LABELS[d.checkType] || d.checkType,
        count: d.count,
      }))
    : defaultData;

  if (chartData.length === 0) {
    return (
      <Card className="!bg-lg-surface !border-lg-border !ring-0">
        <h3 className="font-sans font-semibold text-lg-text mb-4">
          Failure Breakdown
        </h3>
        <div className="flex items-center justify-center h-48 text-sm text-lg-text-muted">
          No failures to break down
        </div>
      </Card>
    );
  }

  return (
    <Card className="!bg-lg-surface !border-lg-border !ring-0">
      <h3 className="font-sans font-semibold text-lg-text mb-4">
        Failure Breakdown
      </h3>
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
    </Card>
  );
}
