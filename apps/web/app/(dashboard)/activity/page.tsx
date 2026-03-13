"use client";

import {
  Bot,
  User,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const timelineEvents = [
  {
    id: "1",
    type: "agent" as const,
    agent: "Claude",
    repo: "acme/frontend",
    commits: [
      { sha: "a3f8b2c", message: "fix: resolve SSR hydration mismatch", status: "passed" as const },
      { sha: "f2e4d6a", message: "test: add hydration test cases", status: "passed" as const },
    ],
    startTime: "14:28",
    endTime: "14:35",
    sessionId: "sess-001",
  },
  {
    id: "2",
    type: "agent" as const,
    agent: "Cursor",
    repo: "acme/api-server",
    commits: [
      { sha: "d9e1f4a", message: "feat: add rate limiting middleware", status: "failed" as const },
      { sha: "b3c5d7e", message: "fix: remove hardcoded API key", status: "passed" as const },
      { sha: "a1b2c3d", message: "fix: resolve lint errors in rate-limit", status: "passed" as const },
    ],
    startTime: "14:12",
    endTime: "14:26",
    sessionId: "sess-002",
  },
  {
    id: "3",
    type: "human" as const,
    agent: null,
    repo: "acme/docs",
    commits: [
      { sha: "g8h2j4k", message: "docs: add API reference for v2", status: "passed" as const },
    ],
    startTime: "13:55",
    endTime: "13:55",
    sessionId: null,
  },
  {
    id: "4",
    type: "agent" as const,
    agent: "Copilot",
    repo: "acme/shared-lib",
    commits: [
      { sha: "b7c2e8d", message: "refactor: extract validation utils", status: "warning" as const },
    ],
    startTime: "13:42",
    endTime: "13:48",
    sessionId: "sess-003",
  },
  {
    id: "5",
    type: "agent" as const,
    agent: "Devin",
    repo: "acme/mobile-app",
    commits: [
      { sha: "c4d6e2f", message: "fix: patch deep linking on Android", status: "passed" as const },
      { sha: "e7f8g9h", message: "test: add deep link integration tests", status: "passed" as const },
      { sha: "i1j2k3l", message: "chore: update React Navigation to v7", status: "passed" as const },
    ],
    startTime: "13:10",
    endTime: "13:35",
    sessionId: "sess-004",
  },
];

const insights = [
  {
    id: "i1",
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-50",
    title: "Cursor introduced lint errors",
    description: "3 times this week across 2 repositories. Most common: unused imports.",
  },
  {
    id: "i2",
    icon: TrendingUp,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    title: "Claude pass rate improved",
    description: "From 89% to 96% over the past 7 days. Zero secret leaks this week.",
  },
  {
    id: "i3",
    icon: AlertTriangle,
    color: "text-red-500",
    bg: "bg-red-50",
    title: "Copilot duplicating code blocks",
    description: "Detected 5 instances of near-identical utility functions across repos.",
  },
];

const statusIcon = {
  passed: <CheckCircle className="h-3 w-3 text-emerald-500" />,
  failed: <XCircle className="h-3 w-3 text-red-500" />,
  warning: <AlertTriangle className="h-3 w-3 text-amber-500" />,
};

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agent Activity</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor AI agent sessions and commit patterns in real time
        </p>
      </div>

      {/* Pattern Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((insight) => (
          <Card key={insight.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${insight.bg} shrink-0`}>
                  <insight.icon className={`h-4.5 w-4.5 ${insight.color}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {insight.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {insight.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Session Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />
            <div className="space-y-6">
              {timelineEvents.map((event) => (
                <div key={event.id} className="relative flex gap-4 pl-1">
                  <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white border-2 border-gray-200 shrink-0">
                    {event.type === "agent" ? (
                      <Bot className="h-4 w-4 text-blue-500" />
                    ) : (
                      <User className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {event.agent || "Human"}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {event.repo}
                        </Badge>
                        {event.sessionId && (
                          <span className="text-xs text-gray-400 font-mono">
                            {event.sessionId}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        {event.startTime} - {event.endTime}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {event.commits.map((commit) => (
                        <div
                          key={commit.sha}
                          className="flex items-center gap-2 text-sm"
                        >
                          {statusIcon[commit.status]}
                          <code className="text-xs font-mono text-gray-400">
                            {commit.sha}
                          </code>
                          <span className="text-gray-700">{commit.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
