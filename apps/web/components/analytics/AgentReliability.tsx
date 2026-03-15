"use client";

import { Card, ProgressCircle, SparkBarChart } from "@tremor/react";

const agents = [
  {
    id: "1", name: "Claude Code", passRate: 94, totalCommits: 156, failedCommits: 9,
    topFailure: "Secrets",
    recentChecks: Array.from({ length: 20 }, (_, i) => ({ status: i === 3 || i === 12 ? "failed" : "passed", value: 1 })),
  },
  {
    id: "2", name: "Cursor", passRate: 87, totalCommits: 89, failedCommits: 12,
    topFailure: "Lint errors",
    recentChecks: Array.from({ length: 20 }, (_, i) => ({ status: i % 6 === 0 ? "failed" : "passed", value: 1 })),
  },
  {
    id: "3", name: "Copilot", passRate: 91, totalCommits: 203, failedCommits: 18,
    topFailure: "Build failures",
    recentChecks: Array.from({ length: 20 }, (_, i) => ({ status: i === 5 || i === 14 ? "failed" : "passed", value: 1 })),
  },
  {
    id: "4", name: "Devin", passRate: 78, totalCommits: 45, failedCommits: 10,
    topFailure: "Agent thrashing",
    recentChecks: Array.from({ length: 20 }, (_, i) => ({ status: i % 4 === 0 ? "failed" : "passed", value: 1 })),
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AgentReliability(_props?: { data?: any[] }) {
  return (
    <Card className="!bg-lg-surface !border-lg-border !ring-0">
      <h3 className="font-sans font-semibold text-lg-text mb-4">
        Agent Reliability
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
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
              <p className="font-mono text-sm font-semibold text-lg-text">
                {agent.name}
              </p>
              <p className="text-xs text-lg-text-secondary">
                {agent.totalCommits} commits · {agent.failedCommits} failures
              </p>
              <p className="text-xs text-lg-text-muted mt-1">
                Most common: {agent.topFailure}
              </p>
            </div>

            <SparkBarChart
              data={agent.recentChecks}
              categories={["value"]}
              index="status"
              colors={["emerald"]}
              className="h-8 w-20"
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
