"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
  Bot,
  Loader2,
  Inbox,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CheckRun {
  id: string;
  repo_id: string;
  commit_sha: string;
  pr_number: number | null;
  branch: string;
  trigger_event: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  warned_checks: number;
  commit_message: string | null;
  commit_author: string | null;
  is_agent_commit: boolean;
  agent_session_id: string | null;
  created_at: string;
}

interface ApiResponse {
  data: CheckRun[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export default function ReviewPage() {
  const [checkRuns, setCheckRuns] = useState<CheckRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChecks() {
      try {
        const res = await fetch("/api/checks?status=failed&limit=20");
        if (!res.ok) {
          throw new Error(`Failed to fetch checks: ${res.status}`);
        }
        const json: ApiResponse = await res.json();
        setCheckRuns(json.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load checks");
      } finally {
        setLoading(false);
      }
    }

    fetchChecks();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-lg-text">Pending Reviews</h1>
          <p className="text-sm text-lg-text-muted mt-1">
            Pull requests flagged by LastGate that require human review
          </p>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-lg-text-muted" />
          <span className="ml-2 text-sm text-lg-text-muted">Loading checks...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-lg-text">Pending Reviews</h1>
          <p className="text-sm text-lg-text-muted mt-1">
            Pull requests flagged by LastGate that require human review
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <XCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-lg-text">
              Failed to load checks
            </p>
            <p className="text-xs text-lg-text-muted mt-1">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (checkRuns.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-lg-text">Pending Reviews</h1>
          <p className="text-sm text-lg-text-muted mt-1">
            Pull requests flagged by LastGate that require human review
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="h-10 w-10 text-lg-text-muted mx-auto mb-3" />
            <p className="text-sm font-medium text-lg-text">
              No checks need review
            </p>
            <p className="text-xs text-lg-text-muted mt-1">
              All check runs are passing. Check back later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-lg-text">Pending Reviews</h1>
        <p className="text-sm text-lg-text-muted mt-1">
          Pull requests flagged by LastGate that require human review
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-lg-border bg-lg-surface-2">
                  <th className="text-left text-xs font-medium text-lg-text-muted uppercase tracking-wider py-3 px-4">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-lg-text-muted uppercase tracking-wider py-3 px-4">
                    Branch
                  </th>
                  <th className="text-left text-xs font-medium text-lg-text-muted uppercase tracking-wider py-3 px-4">
                    Commit
                  </th>
                  <th className="text-left text-xs font-medium text-lg-text-muted uppercase tracking-wider py-3 px-4">
                    Author
                  </th>
                  <th className="text-left text-xs font-medium text-lg-text-muted uppercase tracking-wider py-3 px-4">
                    Issues
                  </th>
                  <th className="text-left text-xs font-medium text-lg-text-muted uppercase tracking-wider py-3 px-4">
                    Time
                  </th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-lg-border">
                {checkRuns.map((run) => (
                  <tr
                    key={run.id}
                    className="hover:bg-lg-surface-2 transition-colors"
                  >
                    <td className="py-3 px-4">
                      {run.failed_checks > 0 ? (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Failed
                        </Badge>
                      ) : run.warned_checks > 0 ? (
                        <Badge variant="warning">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Warning
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          {run.status}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <code className="text-xs font-mono text-lg-text-secondary bg-lg-surface-2 px-1 py-0.5 rounded">
                          {run.branch}
                        </code>
                        {run.pr_number && (
                          <span className="text-xs text-lg-text-muted ml-2">
                            #{run.pr_number}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <span className="text-sm text-lg-text">
                          {run.commit_message
                            ? run.commit_message.length > 60
                              ? run.commit_message.slice(0, 60) + "..."
                              : run.commit_message
                            : run.commit_sha.slice(0, 8)}
                        </span>
                        <div className="mt-0.5">
                          <code className="text-xs font-mono text-lg-text-muted">
                            {run.commit_sha.slice(0, 8)}
                          </code>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {run.is_agent_commit && (
                          <Bot className="h-3.5 w-3.5 text-lg-text-muted" />
                        )}
                        <span className="text-sm text-lg-text-secondary">
                          {run.commit_author || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {run.failed_checks > 0 && (
                          <span className="text-xs font-medium text-lg-fail">
                            {run.failed_checks} failed
                          </span>
                        )}
                        {run.warned_checks > 0 && (
                          <span className="text-xs font-medium text-lg-warn">
                            {run.warned_checks} warnings
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-xs text-lg-text-muted">
                        <Clock className="h-3 w-3" />
                        {timeAgo(run.created_at)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/review/${run.id}`}>
                        <Button size="sm" variant="outline" className="text-xs">
                          Review
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
