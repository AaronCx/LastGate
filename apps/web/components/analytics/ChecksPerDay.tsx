"use client";

import { Card, BarChart } from "@tremor/react";

const data = [
  { date: "Mar 1", Passed: 12, Failed: 2, Warned: 1 },
  { date: "Mar 2", Passed: 18, Failed: 1, Warned: 3 },
  { date: "Mar 3", Passed: 15, Failed: 4, Warned: 2 },
  { date: "Mar 4", Passed: 22, Failed: 0, Warned: 1 },
  { date: "Mar 5", Passed: 28, Failed: 3, Warned: 2 },
  { date: "Mar 6", Passed: 19, Failed: 1, Warned: 0 },
  { date: "Mar 7", Passed: 25, Failed: 2, Warned: 1 },
  { date: "Mar 8", Passed: 31, Failed: 1, Warned: 2 },
  { date: "Mar 9", Passed: 27, Failed: 3, Warned: 1 },
  { date: "Mar 10", Passed: 35, Failed: 2, Warned: 3 },
  { date: "Mar 11", Passed: 29, Failed: 0, Warned: 1 },
  { date: "Mar 12", Passed: 33, Failed: 1, Warned: 0 },
  { date: "Mar 13", Passed: 38, Failed: 2, Warned: 2 },
  { date: "Mar 14", Passed: 42, Failed: 1, Warned: 1 },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ChecksPerDay(_props?: { data?: any[] }) {
  return (
    <Card className="!bg-lg-surface !border-lg-border !ring-0">
      <h3 className="font-sans font-semibold text-lg-text mb-4">
        Checks Per Day
      </h3>
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
    </Card>
  );
}
