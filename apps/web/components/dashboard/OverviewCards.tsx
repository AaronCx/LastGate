"use client";

import { useEffect, useState } from "react";
import { Card, SparkAreaChart, BadgeDelta } from "@tremor/react";

interface AnalyticsData {
  totalChecks: number;
  passRate: number;
  failedChecks: number;
  dailyData?: Array<{ date: string; checks: number; passRate: number; failures: number }>;
}

function KpiCard({
  title,
  value,
  delta,
  deltaType,
  sparkData,
  color,
}: {
  title: string;
  value: string;
  delta: string;
  deltaType: "moderateIncrease" | "moderateDecrease" | "unchanged";
  sparkData: Array<{ date: string; value: number }>;
  color: string;
}) {
  return (
    <Card className="!bg-lg-surface !border-lg-border !ring-0 p-5">
      <p className="text-sm font-sans text-lg-text-secondary">{title}</p>
      <div className="flex items-baseline justify-between mt-2">
        <p
          className="font-mono text-3xl font-bold text-lg-text"
          style={{ animation: "count-up 0.5s ease-out" }}
        >
          {value}
        </p>
        <BadgeDelta deltaType={deltaType} size="sm">
          {delta}
        </BadgeDelta>
      </div>
      {sparkData.length > 0 && (
        <SparkAreaChart
          data={sparkData}
          categories={["value"]}
          index="date"
          colors={[color as "emerald" | "red" | "blue" | "violet" | "amber"]}
          className="mt-4 h-10 w-full"
          curveType="monotone"
        />
      )}
    </Card>
  );
}

function KpiSkeleton() {
  return (
    <Card className="!bg-lg-surface !border-lg-border !ring-0 p-5">
      <div className="h-4 w-24 bg-lg-surface-2 rounded animate-pulse" />
      <div className="h-9 w-20 bg-lg-surface-2 rounded animate-pulse mt-2" />
      <div className="h-10 w-full bg-lg-surface-2 rounded animate-pulse mt-4" />
    </Card>
  );
}

export default function OverviewCards() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [repoCount, setRepoCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics?range=7d").then((r) => r.ok ? r.json() : null),
      fetch("/api/repos").then((r) => r.ok ? r.json() : null),
    ])
      .then(([analytics, repos]) => {
        if (analytics) setData(analytics);
        if (repos) setRepoCount(Array.isArray(repos) ? repos.length : repos?.repos?.length || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiSkeleton />
        <KpiSkeleton />
        <KpiSkeleton />
        <KpiSkeleton />
      </div>
    );
  }

  const daily = data?.dailyData || [];
  const checksSparkData = daily.map((d) => ({ date: d.date, value: d.checks }));
  const passRateSparkData = daily.map((d) => ({ date: d.date, value: d.passRate }));
  const failSparkData = daily.map((d) => ({ date: d.date, value: d.failures }));
  const repoSparkData = daily.map((d) => ({ date: d.date, value: 1 }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        title="Total Checks"
        value={String(data?.totalChecks ?? 0)}
        delta="vs last week"
        deltaType="moderateIncrease"
        sparkData={checksSparkData}
        color="blue"
      />
      <KpiCard
        title="Pass Rate"
        value={`${(data?.passRate ?? 0).toFixed(1)}%`}
        delta="vs last week"
        deltaType="moderateIncrease"
        sparkData={passRateSparkData}
        color="emerald"
      />
      <KpiCard
        title="Blocked Commits"
        value={String(data?.failedChecks ?? 0)}
        delta="vs last week"
        deltaType="moderateDecrease"
        sparkData={failSparkData}
        color="red"
      />
      <KpiCard
        title="Active Repos"
        value={String(repoCount)}
        delta="no change"
        deltaType="unchanged"
        sparkData={repoSparkData}
        color="violet"
      />
    </div>
  );
}
