"use client";

import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

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

const timelineData: TimelineItem[] = [
  {
    id: "1",
    sha: "a3f8b2c",
    branch: "main",
    status: "passed",
    checksTotal: 6,
    checksPassed: 6,
    timestamp: "3 min ago",
    message: "fix: resolve SSR hydration mismatch",
  },
  {
    id: "2",
    sha: "d9e1f4a",
    branch: "feat/rate-limit",
    status: "failed",
    checksTotal: 6,
    checksPassed: 4,
    timestamp: "12 min ago",
    message: "feat: add rate limiting middleware",
  },
  {
    id: "3",
    sha: "b7c2e8d",
    branch: "refactor/utils",
    status: "warning",
    checksTotal: 6,
    checksPassed: 5,
    timestamp: "28 min ago",
    message: "refactor: extract validation utils",
  },
  {
    id: "4",
    sha: "e5f9a1b",
    branch: "main",
    status: "passed",
    checksTotal: 6,
    checksPassed: 6,
    timestamp: "45 min ago",
    message: "feat: implement dark mode toggle",
  },
];

const statusConfig = {
  passed: { icon: CheckCircle, color: "text-emerald-500", line: "bg-emerald-500" },
  failed: { icon: XCircle, color: "text-red-500", line: "bg-red-500" },
  warning: { icon: AlertTriangle, color: "text-amber-500", line: "bg-amber-500" },
};

export default function CheckTimeline() {
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
      <div className="space-y-6">
        {timelineData.map((item) => {
          const config = statusConfig[item.status];
          const StatusIcon = config.icon;
          return (
            <div key={item.id} className="relative flex gap-4 pl-1">
              <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white border-2 border-gray-200">
                <StatusIcon className={`h-4 w-4 ${config.color}`} />
              </div>
              <div className="flex-1 rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-gray-500">
                      {item.sha}
                    </code>
                    <span className="text-xs text-gray-400">{item.branch}</span>
                  </div>
                  <span className="text-xs text-gray-400">{item.timestamp}</span>
                </div>
                <p className="text-sm text-gray-900">{item.message}</p>
                <p className="mt-1 text-xs text-gray-500">
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
