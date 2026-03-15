"use client";

import { Card, BarList } from "@tremor/react";

const data = [
  { name: "Secrets Detected", value: 34 },
  { name: "Lint Errors", value: 28 },
  { name: "Build Failures", value: 18 },
  { name: "Blocked Files", value: 12 },
  { name: "Bad Commit Messages", value: 9 },
  { name: "Agent Thrashing", value: 5 },
  { name: "Dependency Issues", value: 3 },
  { name: "Duplicate Commits", value: 2 },
];

export default function TopFailures() {
  return (
    <Card className="!bg-lg-surface !border-lg-border !ring-0">
      <h3 className="font-sans font-semibold text-lg-text mb-4">
        Top Failures
      </h3>
      <BarList
        data={data}
        color="red"
        valueFormatter={(v: number) => `${v}`}
        showAnimation={true}
      />
    </Card>
  );
}
