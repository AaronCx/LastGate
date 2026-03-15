"use client";

import { Card, Tracker } from "@tremor/react";
import Link from "next/link";

interface RepoHealth {
  id: string;
  name: string;
  health: "healthy" | "degraded" | "failing";
  passRate: number;
  checkHistory: Array<{ status: string; commitSha: string; commitMessage: string }>;
}

const repos: RepoHealth[] = [
  {
    id: "1", name: "AgentForge", health: "healthy", passRate: 94,
    checkHistory: Array.from({ length: 30 }, (_, i) => ({
      status: i === 8 || i === 15 ? "failed" : i === 22 ? "warned" : "passed",
      commitSha: `abc${String(i).padStart(4, "0")}`,
      commitMessage: `commit ${i}`,
    })),
  },
  {
    id: "2", name: "LastGate", health: "healthy", passRate: 100,
    checkHistory: Array.from({ length: 30 }, () => ({ status: "passed", commitSha: "def0001", commitMessage: "all good" })),
  },
  {
    id: "3", name: "NexaBase", health: "degraded", passRate: 87,
    checkHistory: Array.from({ length: 30 }, (_, i) => ({
      status: i % 7 === 0 ? "failed" : i % 5 === 0 ? "warned" : "passed",
      commitSha: `ghi${String(i).padStart(4, "0")}`,
      commitMessage: `commit ${i}`,
    })),
  },
  {
    id: "4", name: "TaskFlow", health: "healthy", passRate: 100,
    checkHistory: Array.from({ length: 30 }, () => ({ status: "passed", commitSha: "jkl0001", commitMessage: "clean" })),
  },
  {
    id: "5", name: "LogLens", health: "degraded", passRate: 90,
    checkHistory: Array.from({ length: 30 }, (_, i) => ({
      status: i === 3 || i === 12 || i === 25 ? "failed" : "passed",
      commitSha: `mno${String(i).padStart(4, "0")}`,
      commitMessage: `commit ${i}`,
    })),
  },
  {
    id: "6", name: "CommitCraft", health: "healthy", passRate: 100,
    checkHistory: Array.from({ length: 30 }, () => ({ status: "passed", commitSha: "pqr0001", commitMessage: "solid" })),
  },
];

export default function RepoHealthGrid() {
  return (
    <Card className="!bg-lg-surface !border-lg-border !ring-0">
      <h3 className="font-sans font-semibold text-lg-text mb-6">
        Repo Health
      </h3>
      <div className="space-y-6">
        {repos.map((repo) => (
          <div key={repo.id}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    repo.health === "healthy"
                      ? "bg-emerald-500"
                      : repo.health === "degraded"
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                />
                <Link
                  href={`/repos/${repo.id}`}
                  className="font-mono text-sm font-medium text-lg-text hover:text-lg-accent transition-colors"
                >
                  {repo.name}
                </Link>
              </div>
              <span className="font-mono text-sm text-lg-text-secondary">
                {repo.passRate}% pass
              </span>
            </div>
            <Tracker
              data={repo.checkHistory.map((check) => ({
                color:
                  check.status === "passed"
                    ? "emerald"
                    : check.status === "failed"
                      ? "red"
                      : check.status === "warned"
                        ? "amber"
                        : "gray",
                tooltip: `${check.commitSha.slice(0, 7)} — ${check.commitMessage}`,
              }))}
              className="h-3"
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-lg-text-muted mt-4">
        Each segment = one check run. Hover for details. Click to view.
      </p>
    </Card>
  );
}
