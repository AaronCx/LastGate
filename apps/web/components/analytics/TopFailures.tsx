"use client";

import { useEffect, useState } from "react";
import { Card, BarList } from "@tremor/react";

interface FailureEntry {
  checkType: string;
  count: number;
}

interface BarListItem {
  name: string;
  value: number;
}

const CHECK_TYPE_LABELS: Record<string, string> = {
  secrets: "Secrets Detected",
  lint: "Lint Errors",
  build: "Build Failures",
  duplicates: "Duplicate Commits",
  file_patterns: "Blocked Files",
  commit_message: "Bad Commit Messages",
  agent_patterns: "Agent Thrashing",
  dependencies: "Dependency Issues",
};

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-4 flex-1 bg-lg-surface-2 rounded animate-pulse" style={{ maxWidth: `${80 - i * 12}%` }} />
          <div className="h-4 w-8 bg-lg-surface-2 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function TopFailures({ range = "7d" }: { range?: string }) {
  const [data, setData] = useState<BarListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/analytics?range=${range}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch analytics");
        return res.json();
      })
      .then((json) => {
        const failures: FailureEntry[] = json.topFailures || [];
        const mapped: BarListItem[] = failures.map((f) => ({
          name: CHECK_TYPE_LABELS[f.checkType] || f.checkType,
          value: f.count,
        }));
        setData(mapped);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load failure data");
      })
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <Card className="!bg-lg-surface !border-lg-border !ring-0">
      <h3 className="font-sans font-semibold text-lg-text mb-4">
        Top Failures
      </h3>

      {loading && <ListSkeleton />}

      {!loading && error && (
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <p className="text-sm text-lg-text-muted">No failures recorded</p>
            <p className="text-xs text-lg-text-muted mt-1">
              All checks are passing — nice work
            </p>
          </div>
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <BarList
          data={data}
          color="red"
          valueFormatter={(v: number) => `${v}`}
          showAnimation={true}
        />
      )}
    </Card>
  );
}
