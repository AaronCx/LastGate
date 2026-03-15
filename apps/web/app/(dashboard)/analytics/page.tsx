"use client";

import { useState } from "react";
import PassRateTrend from "@/components/analytics/PassRateTrend";
import ChecksPerDay from "@/components/analytics/ChecksPerDay";
import FailureHeatmap from "@/components/analytics/FailureHeatmap";
import TopFailures from "@/components/analytics/TopFailures";
import FailureBreakdown from "@/components/analytics/FailureBreakdown";
import AgentReliability from "@/components/analytics/AgentReliability";
import DateRangePicker from "@/components/analytics/DateRangePicker";

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("7d");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-sans text-lg-text">Analytics</h1>
          <p className="text-sm text-lg-text-secondary mt-1">
            Trends and insights across all repositories
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <PassRateTrend range={dateRange} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChecksPerDay range={dateRange} />
        <FailureBreakdown range={dateRange} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FailureHeatmap range={dateRange === "7d" ? "90d" : dateRange} />
        <TopFailures range={dateRange} />
      </div>

      <AgentReliability range={dateRange} />
    </div>
  );
}
