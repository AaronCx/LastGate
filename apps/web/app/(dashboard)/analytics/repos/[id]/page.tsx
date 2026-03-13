"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import DateRangePicker from "@/components/analytics/DateRangePicker";
import PassRateTrend from "@/components/analytics/PassRateTrend";
import FailureBreakdown from "@/components/analytics/FailureBreakdown";
import { ArrowLeft, Bot, User } from "lucide-react";

interface RepoAnalyticsData {
  repoId: string;
  range: string;
  summary: {
    totalRuns: number;
    passedRuns: number;
    passRate: number;
  };
  dailyPassRate: {
    day: string;
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  }[];
  failureBreakdown: { checkType: string; count: number }[];
  agentVsHuman: {
    agent: { total: number; passed: number; passRate: number };
    human: { total: number; passed: number; passRate: number };
  };
}

export default function RepoAnalyticsPage() {
  const params = useParams();
  const repoId = params.id as string;
  const [range, setRange] = useState("7d");
  const [data, setData] = useState<RepoAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/repos/${repoId}?range=${range}`)
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [repoId, range]);

  const summary = data?.summary;
  const avh = data?.agentVsHuman;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/analytics"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Analytics
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Repository Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Performance and failure analysis
          </p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm font-medium text-gray-500">Total Checks</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {loading ? "..." : summary?.totalRuns ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm font-medium text-gray-500">Pass Rate</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {loading ? "..." : `${summary?.passRate ?? 0}%`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm font-medium text-gray-500">Passed</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {loading ? "..." : summary?.passedRuns ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agent vs Human */}
      {!loading && avh && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
                  <Bot className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Agent Commits</p>
                  <p className="text-xs text-gray-500">
                    {avh.agent.total} total, {avh.agent.passRate}% pass rate
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                  <User className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Human Commits</p>
                  <p className="text-xs text-gray-500">
                    {avh.human.total} total, {avh.human.passRate}% pass rate
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
            <CardTitle className="text-lg">Failure Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-sm text-gray-400">Loading...</div>
            ) : (
              <FailureBreakdown data={data?.failureBreakdown || []} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
