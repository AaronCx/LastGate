"use client";

import { useEffect, useState } from "react";
import { Card, Tracker } from "@tremor/react";
import Link from "next/link";

interface Repo {
  id: string;
  full_name: string;
  enabled: boolean;
}

interface CheckRun {
  id: string;
  status: string;
  commit_sha: string;
  commit_message: string | null;
}

interface RepoHealth {
  id: string;
  name: string;
  health: "healthy" | "degraded" | "failing";
  passRate: number;
  checkHistory: Array<{ status: string; commitSha: string; commitMessage: string }>;
}

function HealthSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-2">
            <div className="h-4 w-32 bg-lg-surface-2 rounded animate-pulse" />
            <div className="h-4 w-16 bg-lg-surface-2 rounded animate-pulse" />
          </div>
          <div className="h-3 w-full bg-lg-surface-2 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function RepoHealthGrid() {
  const [repos, setRepos] = useState<RepoHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const reposRes = await fetch("/api/repos");
        if (!reposRes.ok) throw new Error("Failed to fetch repos");
        const reposJson = await reposRes.json();
        const repoList: Repo[] = reposJson.data || [];

        if (repoList.length === 0) {
          setRepos([]);
          return;
        }

        // Fetch recent checks for each repo in parallel
        const healthData = await Promise.all(
          repoList.map(async (repo) => {
            try {
              const checksRes = await fetch(
                `/api/checks?repo=${encodeURIComponent(repo.full_name)}&limit=30`
              );
              if (!checksRes.ok) return null;
              const checksJson = await checksRes.json();
              const checks: CheckRun[] = checksJson.data || [];

              const total = checks.length;
              const passed = checks.filter((c) => c.status === "passed").length;
              const failed = checks.filter((c) => c.status === "failed").length;
              const passRate = total > 0 ? Math.round((passed / total) * 100) : 100;

              let health: "healthy" | "degraded" | "failing" = "healthy";
              if (passRate < 70) health = "failing";
              else if (passRate < 90) health = "degraded";

              return {
                id: repo.id,
                name: repo.full_name,
                health,
                passRate,
                checkHistory: checks.map((c) => ({
                  status: c.status,
                  commitSha: c.commit_sha || "",
                  commitMessage: c.commit_message || "(no message)",
                })),
              } as RepoHealth;
            } catch {
              return null;
            }
          })
        );

        setRepos(healthData.filter((r): r is RepoHealth => r !== null));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load repo health");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <Card className="!bg-lg-surface !border-lg-border !ring-0">
      <h3 className="font-sans font-semibold text-lg-text mb-6">
        Repo Health
      </h3>

      {loading && <HealthSkeleton />}

      {!loading && error && (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && repos.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-sm text-lg-text-muted">No repos connected</p>
            <p className="text-xs text-lg-text-muted mt-1">
              Install the GitHub App to get started
            </p>
          </div>
        </div>
      )}

      {!loading && !error && repos.length > 0 && (
        <>
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
                {repo.checkHistory.length > 0 ? (
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
                ) : (
                  <div className="h-3 w-full bg-lg-surface-2 rounded" />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-lg-text-muted mt-4">
            Each segment = one check run. Hover for details. Click to view.
          </p>
        </>
      )}
    </Card>
  );
}
