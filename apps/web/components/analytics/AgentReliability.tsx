"use client";

import { useEffect, useState } from "react";
import { Card, ProgressCircle, SparkBarChart } from "@tremor/react";

interface AgentEntry {
  author: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
}

interface AgentReliabilityProps {
  data?: AgentEntry[];
  range?: string;
}

function AgentSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-lg-surface-2">
          <div className="h-16 w-16 rounded-full bg-lg-surface animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 bg-lg-surface rounded animate-pulse" />
            <div className="h-3 w-32 bg-lg-surface rounded animate-pulse" />
            <div className="h-3 w-20 bg-lg-surface rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AgentReliability({ data: propData, range = "7d" }: AgentReliabilityProps) {
  const [agents, setAgents] = useState<AgentEntry[]>([]);
  const [loading, setLoading] = useState(!propData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If data is passed as prop, use it directly
    if (propData) {
      setAgents(propData);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/analytics/agents?range=${range}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch agent data");
        return res.json();
      })
      .then((json) => {
        setAgents(json.agentReliability || []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load agent data");
      })
      .finally(() => setLoading(false));
  }, [propData, range]);

  // When used standalone (not inside agent analytics page), wrap in Card
  const isStandalone = !propData;

  const content = (
    <>
      {isStandalone && (
        <h3 className="font-sans font-semibold text-lg-text mb-4">
          Agent Reliability
        </h3>
      )}

      {loading && <AgentSkeleton />}

      {!loading && error && (
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && agents.length === 0 && (
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <p className="text-sm text-lg-text-muted">No agent commits detected</p>
            <p className="text-xs text-lg-text-muted mt-1">
              Agent reliability scores will appear when AI-authored commits are analyzed
            </p>
          </div>
        </div>
      )}

      {!loading && !error && agents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => {
            // Generate spark data from pass/fail ratio
            const sparkData = Array.from({ length: Math.min(agent.total, 20) }, (_, i) => ({
              index: String(i),
              value: 1,
            }));

            return (
              <div
                key={agent.author}
                className="flex items-center gap-4 p-4 rounded-lg bg-lg-surface-2"
              >
                <ProgressCircle
                  value={agent.passRate}
                  size="md"
                  color={agent.passRate > 90 ? "emerald" : agent.passRate > 70 ? "amber" : "red"}
                >
                  <span className="font-mono text-sm font-bold text-lg-text">
                    {agent.passRate}%
                  </span>
                </ProgressCircle>

                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-semibold text-lg-text truncate">
                    {agent.author}
                  </p>
                  <p className="text-xs text-lg-text-secondary font-mono">
                    {agent.total} commits · {agent.failed} failures
                  </p>
                  <p className="text-xs text-lg-text-muted mt-1">
                    {agent.passed} passed
                  </p>
                </div>

                {sparkData.length > 0 && (
                  <SparkBarChart
                    data={sparkData}
                    categories={["value"]}
                    index="index"
                    colors={["emerald"]}
                    className="h-8 w-20"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  if (isStandalone) {
    return (
      <Card className="!bg-lg-surface !border-lg-border !ring-0">
        {content}
      </Card>
    );
  }

  return content;
}
