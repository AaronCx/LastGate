"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import DateRangePicker from "@/components/analytics/DateRangePicker";
import PassRateTrend from "@/components/analytics/PassRateTrend";
import ChecksPerDay from "@/components/analytics/ChecksPerDay";
import FailureHeatmap from "@/components/analytics/FailureHeatmap";
import TopFailures from "@/components/analytics/TopFailures";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

interface AnalyticsData {
  range: string;
  summary: {
    totalRuns: number;
    passedRuns: number;
    failedRuns: number;
    warnedRuns: number;
    passRate: number;
  };
  dailyPassRate: {
    day: string;
    total: number;
    passed: number;
    failed: number;
    warned: number;
    passRate: number;
  }[];
  topFailures: { checkType: string; count: number }[];
}

export default function AnalyticsPage() {
  const [range, setRange] = useState("7d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?range=${range}`)
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [range]);

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Check trends, failure patterns, and agent insights
          </p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Checks</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {loading ? "..." : summary?.totalRuns ?? 0}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pass Rate</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">
                  {loading ? "..." : `${summary?.passRate ?? 0}%`}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Failed</p>
                <p className="mt-1 text-2xl font-bold text-red-600">
                  {loading ? "..." : summary?.failedRuns ?? 0}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Warnings</p>
                <p className="mt-1 text-2xl font-bold text-amber-600">
                  {loading ? "..." : summary?.warnedRuns ?? 0}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pass Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-sm text-gray-400">Loading...</div>
            ) : (
              <PassRateTrend data={data?.dailyPassRate || []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Checks Per Day</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-sm text-gray-400">Loading...</div>
            ) : (
              <ChecksPerDay data={data?.dailyPassRate || []} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Failure Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-32 flex items-center justify-center text-sm text-gray-400">Loading...</div>
            ) : (
              <FailureHeatmap data={data?.dailyPassRate || []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Failures</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-32 flex items-center justify-center text-sm text-gray-400">Loading...</div>
            ) : (
              <TopFailures data={data?.topFailures || []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Links to sub-pages */}
      <div className="flex gap-4">
        <Link
          href="/analytics/agents"
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          View Agent Analytics →
        </Link>
      </div>
    </div>
  );
}
