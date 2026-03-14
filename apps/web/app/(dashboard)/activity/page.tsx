"use client";

import { useState, useEffect } from "react";
import {
  Bot,
  User,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CheckRun {
  id: string;
  repo_id: string;
  commit_sha: string;
  branch: string;
  status: string;
  commit_message: string | null;
  commit_author: string | null;
  is_agent_commit: boolean;
  agent_session_id: string | null;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  warned_checks: number;
  created_at: string;
  completed_at: string | null;
}

interface Repo {
  id: string;
  full_name: string;
}

const statusIcon: Record<string, React.ReactNode> = {
  passed: <CheckCircle className="h-3 w-3 text-emerald-500" />,
  failed: <XCircle className="h-3 w-3 text-red-500" />,
  warned: <AlertTriangle className="h-3 w-3 text-amber-500" />,
  pending: <Clock className="h-3 w-3 text-gray-400" />,
  running: <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />,
};

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ActivityPage() {
  const [checkRuns, setCheckRuns] = useState<CheckRun[]>([]);
  const [repoMap, setRepoMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const [checksRes, reposRes] = await Promise.all([
          fetch("/api/checks?limit=50"),
          fetch("/api/repos"),
        ]);

        if (!checksRes.ok) {
          throw new Error(`Failed to fetch checks (${checksRes.status})`);
        }
        if (!reposRes.ok) {
          throw new Error(`Failed to fetch repos (${reposRes.status})`);
        }

        const checksJson = await checksRes.json();
        const reposJson = await reposRes.json();

        const repos: Repo[] = reposJson.data || [];
        const map: Record<string, string> = {};
        for (const repo of repos) {
          map[repo.id] = repo.full_name;
        }

        setRepoMap(map);
        setCheckRuns(checksJson.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load activity");
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Activity</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor AI agent sessions and commit patterns
          </p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading activity...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Activity</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor AI agent sessions and commit patterns
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agent Activity</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor AI agent sessions and commit patterns
        </p>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {checkRuns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-600">No activity yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Check runs will appear here once commits are pushed to monitored repositories.
              </p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />
              <div className="space-y-6">
                {checkRuns.map((run) => {
                  const repoName = repoMap[run.repo_id] || run.repo_id;
                  const icon = statusIcon[run.status] || statusIcon.pending;

                  return (
                    <div key={run.id} className="relative flex gap-4 pl-1">
                      <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white border-2 border-gray-200 shrink-0">
                        {run.is_agent_commit ? (
                          <Bot className="h-4 w-4 text-blue-500" />
                        ) : (
                          <User className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 rounded-lg border border-gray-200 bg-white p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {run.commit_author || "Unknown"}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {repoName}
                            </Badge>
                            <Badge
                              variant={run.is_agent_commit ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {run.is_agent_commit ? "Agent" : "Human"}
                            </Badge>
                            {run.agent_session_id && (
                              <span className="text-xs text-gray-400 font-mono">
                                {run.agent_session_id}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            {formatTimestamp(run.created_at)}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-sm">
                            {icon}
                            <code className="text-xs font-mono text-gray-400">
                              {run.commit_sha.slice(0, 7)}
                            </code>
                            <span className="text-gray-700">
                              {run.commit_message || "No commit message"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-emerald-500" />
                              {run.passed_checks} passed
                            </span>
                            {run.failed_checks > 0 && (
                              <span className="flex items-center gap-1">
                                <XCircle className="h-3 w-3 text-red-500" />
                                {run.failed_checks} failed
                              </span>
                            )}
                            {run.warned_checks > 0 && (
                              <span className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                                {run.warned_checks} warned
                              </span>
                            )}
                            <span className="text-gray-300">|</span>
                            <span>{run.branch}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
