"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface CheckRun {
  id: string;
  commit_sha: string;
  branch: string;
  status: string;
  commit_message: string | null;
  total_checks: number;
  passed_checks: number;
  created_at: string;
}

interface TimelineItem {
  id: string;
  sha: string;
  branch: string;
  status: "passed" | "failed" | "warning";
  checksTotal: number;
  checksPassed: number;
  timestamp: string;
  message: string;
}

const statusConfig = {
  passed: { icon: CheckCircle, color: "text-emerald-500", line: "bg-emerald-500" },
  failed: { icon: XCircle, color: "text-red-500", line: "bg-red-500" },
  warning: { icon: AlertTriangle, color: "text-amber-500", line: "bg-amber-500" },
};

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function mapStatus(status: string): "passed" | "failed" | "warning" {
  if (status === "passed" || status === "pass") return "passed";
  if (status === "failed" || status === "fail") return "failed";
  return "warning";
}

function TimelineSkeleton() {
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-lg-surface-2" />
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="relative flex gap-4 pl-1">
            <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-lg-surface border-2 border-lg-border">
              <div className="h-4 w-4 bg-lg-surface-2 rounded animate-pulse" />
            </div>
            <div className="flex-1 rounded-lg border border-lg-border bg-lg-surface p-3">
              <div className="h-3 w-32 bg-lg-surface-2 rounded animate-pulse mb-2" />
              <div className="h-4 w-48 bg-lg-surface-2 rounded animate-pulse mb-1" />
              <div className="h-3 w-24 bg-lg-surface-2 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CheckTimeline({ repoName }: { repoName?: string }) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ limit: "20" });
    if (repoName) params.set("repo", repoName);

    fetch(`/api/checks?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch check timeline");
        return res.json();
      })
      .then((json) => {
        const checks: CheckRun[] = json.data || [];
        const mapped: TimelineItem[] = checks.map((c) => ({
          id: c.id,
          sha: (c.commit_sha || "").slice(0, 7),
          branch: c.branch || "unknown",
          status: mapStatus(c.status),
          checksTotal: c.total_checks,
          checksPassed: c.passed_checks,
          timestamp: formatTimeAgo(c.created_at),
          message: c.commit_message || "(no message)",
        }));
        setItems(mapped);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load timeline");
      })
      .finally(() => setLoading(false));
  }, [repoName]);

  if (loading) return <TimelineSkeleton />;

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-sm text-lg-text-muted">No check runs yet</p>
          <p className="text-xs text-lg-text-muted mt-1">
            Timeline will populate as commits are analyzed
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-lg-border" />
      <div className="space-y-6">
        {items.map((item) => {
          const config = statusConfig[item.status];
          const StatusIcon = config.icon;
          return (
            <div key={item.id} className="relative flex gap-4 pl-1">
              <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-lg-surface border-2 border-lg-border">
                <StatusIcon className={`h-4 w-4 ${config.color}`} />
              </div>
              <div className="flex-1 rounded-lg border border-lg-border bg-lg-surface p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-lg-text-muted">
                      {item.sha}
                    </code>
                    <span className="text-xs text-lg-text-muted">{item.branch}</span>
                  </div>
                  <span className="text-xs text-lg-text-muted">{item.timestamp}</span>
                </div>
                <p className="text-sm text-lg-text">{item.message}</p>
                <p className="mt-1 text-xs text-lg-text-secondary font-mono">
                  {item.checksPassed}/{item.checksTotal} checks passed
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
