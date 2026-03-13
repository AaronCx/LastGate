"use client";

import { CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const activities = [
  {
    id: "1",
    repo: "acme/frontend",
    commit: "fix: resolve SSR hydration mismatch",
    sha: "a3f8b2c",
    status: "passed" as const,
    agent: "Claude",
    timestamp: new Date(Date.now() - 1000 * 60 * 3),
  },
  {
    id: "2",
    repo: "acme/api-server",
    commit: "feat: add rate limiting middleware",
    sha: "d9e1f4a",
    status: "failed" as const,
    agent: "Cursor",
    timestamp: new Date(Date.now() - 1000 * 60 * 12),
  },
  {
    id: "3",
    repo: "acme/shared-lib",
    commit: "refactor: extract validation utils",
    sha: "b7c2e8d",
    status: "warning" as const,
    agent: "Copilot",
    timestamp: new Date(Date.now() - 1000 * 60 * 28),
  },
  {
    id: "4",
    repo: "acme/frontend",
    commit: "feat: implement dark mode toggle",
    sha: "e5f9a1b",
    status: "passed" as const,
    agent: "Claude",
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
  },
  {
    id: "5",
    repo: "acme/mobile-app",
    commit: "fix: patch deep linking on Android",
    sha: "c4d6e2f",
    status: "passed" as const,
    agent: "Devin",
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
  },
  {
    id: "6",
    repo: "acme/api-server",
    commit: "chore: update dependencies",
    sha: "f1a3b5c",
    status: "warning" as const,
    agent: "Copilot",
    timestamp: new Date(Date.now() - 1000 * 60 * 90),
  },
  {
    id: "7",
    repo: "acme/docs",
    commit: "docs: add API reference for v2",
    sha: "g8h2j4k",
    status: "passed" as const,
    agent: null,
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
  },
];

const statusConfig = {
  passed: {
    icon: CheckCircle,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    label: "Passed",
  },
  failed: {
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-50",
    label: "Failed",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-50",
    label: "Warning",
  },
};

export default function ActivityFeed() {
  return (
    <div className="space-y-1">
      {activities.map((activity) => {
        const config = statusConfig[activity.status];
        const StatusIcon = config.icon;
        return (
          <div
            key={activity.id}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${config.bg} shrink-0`}
            >
              <StatusIcon className={`h-4 w-4 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {activity.repo}
                </span>
                <code className="text-xs text-gray-400 font-mono">
                  {activity.sha}
                </code>
              </div>
              <p className="text-sm text-gray-600 truncate">
                {activity.commit}
              </p>
            </div>
            <div className="text-right shrink-0">
              {activity.agent && (
                <span className="text-xs font-medium text-gray-500">
                  {activity.agent}
                </span>
              )}
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
