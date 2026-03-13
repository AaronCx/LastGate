"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import DateRangePicker from "@/components/analytics/DateRangePicker";
import AgentReliability from "@/components/analytics/AgentReliability";
import AgentMistakes from "@/components/analytics/AgentMistakes";
import { Bot, User, ArrowLeft } from "lucide-react";

interface AgentData {
  range: string;
  summary: {
    agentTotal: number;
    agentPassRate: number;
    humanTotal: number;
    humanPassRate: number;
  };
  agentReliability: {
    author: string;
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  }[];
  commonMistakes: {
    checkType: string;
    count: number;
    percentage: number;
  }[];
  sessionHeatmap: {
    hour: number;
    count: number;
  }[];
}

export default function AgentAnalyticsPage() {
  const [range, setRange] = useState("7d");
  const [data, setData] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/agents?range=${range}`)
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [range]);

  const summary = data?.summary;
  const maxHeat = Math.max(...(data?.sessionHeatmap?.map((h) => h.count) || [1]));

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
          <h1 className="text-2xl font-bold text-gray-900">Agent Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Agent reliability, common mistakes, and activity patterns
          </p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Agent vs Human comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Agent Commits</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {loading ? "..." : summary?.agentTotal ?? 0}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {loading ? "" : `${summary?.agentPassRate ?? 0}% pass rate`}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
                <Bot className="h-5 w-5 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Human Commits</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {loading ? "..." : summary?.humanTotal ?? 0}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {loading ? "" : `${summary?.humanPassRate ?? 0}% pass rate`}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <User className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Agent Reliability</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-sm text-gray-400">Loading...</div>
            ) : (
              <AgentReliability data={data?.agentReliability || []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Common Agent Mistakes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-32 flex items-center justify-center text-sm text-gray-400">Loading...</div>
            ) : (
              <AgentMistakes data={data?.commonMistakes || []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Session heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Agent Activity by Hour</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-20 flex items-center justify-center text-sm text-gray-400">Loading...</div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-1">
                {(data?.sessionHeatmap || []).map((h) => (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-sm transition-colors"
                      style={{
                        height: 32,
                        backgroundColor:
                          h.count === 0
                            ? "#f3f4f6"
                            : `rgba(139, 92, 246, ${Math.max(0.15, h.count / maxHeat)})`,
                      }}
                      title={`${h.hour}:00 — ${h.count} commit${h.count !== 1 ? "s" : ""}`}
                    />
                    {h.hour % 6 === 0 && (
                      <span className="text-[10px] text-gray-400">{h.hour}:00</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
