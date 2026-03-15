"use client";

import { useEffect, useState } from "react";
import { Card } from "@tremor/react";
import Link from "next/link";

interface CheckRun {
  id: string;
  commit_sha: string;
  commit_message: string | null;
  commit_author: string | null;
  status: string;
  repo_id: string;
  created_at: string;
  is_agent_commit: boolean;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  warned_checks: number;
}

interface Activity {
  id: string;
  timeAgo: string;
  repoName: string;
  commitSha: string;
  commitMessage: string;
  status: string;
  checkRunId: string;
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    passed: { label: "PASS", bg: "bg-emerald-500/10", text: "text-emerald-400" },
    failed: { label: "FAIL", bg: "bg-red-500/10", text: "text-red-400" },
    warned: { label: "WARN", bg: "bg-amber-500/10", text: "text-amber-400" },
  }[status] || { label: status.toUpperCase(), bg: "bg-gray-500/10", text: "text-gray-400" };

  return (
    <span className={`font-mono text-xs font-semibold px-2 py-1 rounded ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3 px-2">
          <div className="h-4 w-14 bg-lg-surface-2 rounded animate-pulse" />
          <div className="h-4 w-24 bg-lg-surface-2 rounded animate-pulse" />
          <div className="h-4 w-14 bg-lg-surface-2 rounded animate-pulse" />
          <div className="h-4 flex-1 bg-lg-surface-2 rounded animate-pulse" />
          <div className="h-6 w-12 bg-lg-surface-2 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const [checksRes, reposRes] = await Promise.all([
          fetch("/api/checks?limit=10"),
          fetch("/api/repos"),
        ]);

        if (!checksRes.ok) {
          throw new Error("Failed to fetch recent checks");
        }

        const checksJson = await checksRes.json();
        const checks: CheckRun[] = checksJson.data || [];

        // Build repo ID -> name map
        let repoMap = new Map<string, string>();
        if (reposRes.ok) {
          const reposJson = await reposRes.json();
          const repos = reposJson.data || [];
          for (const repo of repos) {
            repoMap.set(repo.id, repo.full_name);
          }
        }

        const mapped: Activity[] = checks.map((c) => ({
          id: c.id,
          timeAgo: formatTimeAgo(c.created_at),
          repoName: repoMap.get(c.repo_id) || "Unknown repo",
          commitSha: c.commit_sha || "",
          commitMessage: c.commit_message || "(no message)",
          status: c.status,
          checkRunId: c.id,
        }));

        setActivities(mapped);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load activity");
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
  }, []);

  return (
    <Card className="!bg-lg-surface !border-lg-border !ring-0">
      <h3 className="font-sans font-semibold text-lg-text mb-4 flex items-center gap-2">
        Live Activity
        <span
          className="w-2 h-2 rounded-full bg-emerald-500"
          style={{ animation: "pulse-live 2s ease-in-out infinite" }}
        />
      </h3>

      {loading && <ActivitySkeleton />}

      {!loading && error && (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && activities.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-lg-text-muted">
            No recent activity — push a commit to a connected repo to see results here
          </p>
        </div>
      )}

      {!loading && !error && activities.length > 0 && (
        <div className="space-y-0">
          {activities.map((activity, i) => (
            <Link
              key={activity.id}
              href={`/review/${activity.checkRunId}`}
              className="flex items-center gap-4 py-3 px-2 -mx-2 rounded-lg
                         hover:bg-lg-surface-2 transition-colors group"
              style={{ animationDelay: `${i * 50}ms`, animation: "fade-in-up 0.3s ease-out backwards" }}
            >
              <span className="font-mono text-xs text-lg-text-muted w-16 shrink-0">
                {activity.timeAgo}
              </span>
              <span className="font-mono text-xs text-lg-accent w-28 shrink-0 truncate">
                {activity.repoName}
              </span>
              <code className="font-mono text-xs text-lg-text-secondary w-16 shrink-0">
                {activity.commitSha.slice(0, 7)}
              </code>
              <span className="text-sm text-lg-text truncate flex-1 group-hover:text-lg-text transition-colors">
                {activity.commitMessage}
              </span>
              <StatusBadge status={activity.status} />
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
