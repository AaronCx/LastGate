"use client";

import { Card } from "@tremor/react";
import Link from "next/link";

const activities = [
  { id: "1", timeAgo: "2m ago", repoName: "AgentForge", commitSha: "abc1234", commitMessage: "feat: add auth flow", status: "passed", checkRunId: "cr-1" },
  { id: "2", timeAgo: "14m ago", repoName: "NexaBase", commitSha: "def5678", commitMessage: "fix: db connection", status: "failed", checkRunId: "cr-2" },
  { id: "3", timeAgo: "23m ago", repoName: "AgentForge", commitSha: "ghi9012", commitMessage: "chore: update deps", status: "passed", checkRunId: "cr-3" },
  { id: "4", timeAgo: "1h ago", repoName: "LogLens", commitSha: "jkl3456", commitMessage: "feat: add filters", status: "warned", checkRunId: "cr-4" },
  { id: "5", timeAgo: "2h ago", repoName: "TaskFlow", commitSha: "mno7890", commitMessage: "docs: update README", status: "passed", checkRunId: "cr-5" },
  { id: "6", timeAgo: "3h ago", repoName: "CommitCraft", commitSha: "pqr1234", commitMessage: "fix: resolve race condition", status: "passed", checkRunId: "cr-6" },
  { id: "7", timeAgo: "5h ago", repoName: "NexaBase", commitSha: "stu5678", commitMessage: "feat: add caching layer", status: "failed", checkRunId: "cr-7" },
];

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

export default function ActivityFeed() {
  return (
    <Card className="!bg-lg-surface !border-lg-border !ring-0">
      <h3 className="font-sans font-semibold text-lg-text mb-4 flex items-center gap-2">
        Live Activity
        <span
          className="w-2 h-2 rounded-full bg-emerald-500"
          style={{ animation: "pulse-live 2s ease-in-out infinite" }}
        />
      </h3>
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
    </Card>
  );
}
