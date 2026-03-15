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
            className="inline-flex items-center gap-1 text-sm text-lg-text-muted hover:text-lg-text-secondary mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Analytics
          </Link>
          <h1 className="text-2xl font-bold text-lg-text">Repository Analytics</h1>
          <p className="text-sm text-lg-text-muted mt-1">
            Performance and failure analysis
          </p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm font-medium text-lg-text-muted">Total Checks</p>
            <p className="mt-1 text-2xl font-bold text-lg-text">
              {loading ? "..." : summary?.totalRuns ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm font-medium text-lg-text-muted">Pass Rate</p>
            <p className="mt-1 text-2xl font-bold text-lg-pass">
              {loading ? "..." : `${summary?.passRate ?? 0}%`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm font-medium text-lg-text-muted">Passed</p>
            <p className="mt-1 text-2xl font-bold text-lg-text">
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
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lg-accent/10">
                  <Bot className="h-4 w-4 text-lg-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-lg-text-secondary">Agent Commits</p>
                  <p className="text-xs text-lg-text-muted">
                    {avh.agent.total} total, {avh.agent.passRate}% pass rate
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lg-accent/10">
                  <User className="h-4 w-4 text-lg-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-lg-text-secondary">Human Commits</p>
                  <p className="text-xs text-lg-text-muted">
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
              <div className="h-64 flex items-center justify-center text-sm text-lg-text-muted">Loading...</div>
            ) : (
              <PassRateTrend range={range} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Failure Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-sm text-lg-text-muted">Loading...</div>
            ) : (
              <FailureBreakdown data={data?.failureBreakdown || []} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
