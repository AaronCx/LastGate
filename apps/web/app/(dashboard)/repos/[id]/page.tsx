"use client";

import { useState, useEffect, Fragment } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Filter,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface CheckResult {
  id: string;
  check_type: string;
  status: string;
  title: string;
  summary: string | null;
  duration_ms: number | null;
}

interface CheckRun {
  id: string;
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
  results?: CheckResult[];
}

interface Repo {
  id: string;
  full_name: string;
  default_branch: string;
  is_active: boolean;
}

const statusConfig: Record<
  string,
  { icon: typeof CheckCircle; color: string; badge: "success" | "destructive" | "warning" | "default" }
> = {
  passed: { icon: CheckCircle, color: "text-emerald-500", badge: "success" },
  pass: { icon: CheckCircle, color: "text-emerald-500", badge: "success" },
  failed: { icon: XCircle, color: "text-red-500", badge: "destructive" },
  fail: { icon: XCircle, color: "text-red-500", badge: "destructive" },
  warning: { icon: AlertTriangle, color: "text-amber-500", badge: "warning" },
  warn: { icon: AlertTriangle, color: "text-amber-500", badge: "warning" },
  warned: { icon: AlertTriangle, color: "text-amber-500", badge: "warning" },
  pending: { icon: AlertTriangle, color: "text-lg-text-muted", badge: "default" },
  running: { icon: AlertTriangle, color: "text-blue-400", badge: "default" },
};

const defaultStatusConfig = {
  icon: AlertTriangle,
  color: "text-lg-text-muted",
  badge: "default" as const,
};

function getConfig(status: string) {
  return statusConfig[status] || defaultStatusConfig;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function RepoDetailPage() {
  const params = useParams();
  const repoId = params.id as string;

  const [repo, setRepo] = useState<Repo | null>(null);
  const [checkRuns, setCheckRuns] = useState<CheckRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedLoading, setExpandedLoading] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch the repo details from the repos list
        const reposRes = await fetch("/api/repos");
        if (!reposRes.ok) {
          throw new Error(`Failed to fetch repository (${reposRes.status})`);
        }
        const reposJson = await reposRes.json();
        const repos: Repo[] = reposJson.data || [];
        const foundRepo = repos.find((r: Repo) => r.id === repoId);

        if (!foundRepo) {
          throw new Error("Repository not found");
        }
        setRepo(foundRepo);

        // Fetch check runs for this repo using its full_name
        const checksRes = await fetch(
          `/api/checks?repo=${encodeURIComponent(foundRepo.full_name)}&limit=50`
        );
        if (!checksRes.ok) {
          throw new Error(`Failed to fetch check runs (${checksRes.status})`);
        }
        const checksJson = await checksRes.json();
        setCheckRuns(checksJson.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [repoId]);

  const toggleRow = async (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) {
      next.delete(id);
      setExpandedRows(next);
      return;
    }

    // Fetch detailed results for this check run if not already loaded
    const run = checkRuns.find((r) => r.id === id);
    if (run && !run.results) {
      setExpandedLoading((prev) => new Set(prev).add(id));
      try {
        const res = await fetch(`/api/checks/${id}`);
        if (res.ok) {
          const detail = await res.json();
          setCheckRuns((prev) =>
            prev.map((r) =>
              r.id === id ? { ...r, results: detail.results || [] } : r
            )
          );
        }
      } catch {
        // Silently fail; the row will expand with no results
      } finally {
        setExpandedLoading((prev) => {
          const s = new Set(prev);
          s.delete(id);
          return s;
        });
      }
    }

    next.add(id);
    setExpandedRows(next);
  };

  const filtered =
    statusFilter === "all"
      ? checkRuns
      : checkRuns.filter((c) => c.status === statusFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-lg-text-muted" />
        <span className="ml-2 text-sm text-lg-text-muted">Loading repository details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/repos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-lg-text">Repository</h1>
          </div>
        </div>
        <div className="text-center py-12">
          <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-lg-fail">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/repos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-lg-text">
            {repo?.full_name || "Repository"}
          </h1>
          <p className="text-sm text-lg-text-muted">
            Branch: {repo?.default_branch || "main"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Check History</CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-lg-text-muted" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-lg-border rounded-md px-2 py-1 bg-lg-surface text-lg-text"
            >
              <option value="all">All Statuses</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="warned">Warning</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {checkRuns.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-lg-text-muted">
                No check runs found for this repository.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-lg-border">
                    <th className="text-left text-xs font-medium text-lg-text-muted uppercase tracking-wider py-3 px-2 w-8" />
                    <th className="text-left text-xs font-medium text-lg-text-muted uppercase tracking-wider py-3 px-2">
                      Commit
                    </th>
                    <th className="text-left text-xs font-medium text-lg-text-muted uppercase tracking-wider py-3 px-2">
                      Branch
                    </th>
                    <th className="text-left text-xs font-medium text-lg-text-muted uppercase tracking-wider py-3 px-2">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-lg-text-muted uppercase tracking-wider py-3 px-2">
                      Checks
                    </th>
                    <th className="text-left text-xs font-medium text-lg-text-muted uppercase tracking-wider py-3 px-2">
                      Author
                    </th>
                    <th className="text-left text-xs font-medium text-lg-text-muted uppercase tracking-wider py-3 px-2">
                      Date
                    </th>
                    <th className="py-3 px-2 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-lg-border">
                  {filtered.map((run) => {
                    const config = getConfig(run.status);
                    const StatusIcon = config.icon;
                    const isExpanded = expandedRows.has(run.id);
                    const isLoadingDetail = expandedLoading.has(run.id);

                    return (
                      <Fragment key={run.id}>
                        <tr
                          className="hover:bg-lg-surface-2 cursor-pointer transition-colors"
                          onClick={() => toggleRow(run.id)}
                        >
                          <td className="py-3 px-2">
                            {isLoadingDetail ? (
                              <Loader2 className="h-4 w-4 animate-spin text-lg-text-muted" />
                            ) : isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-lg-text-muted" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-lg-text-muted" />
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <div>
                              <code className="text-xs font-mono text-lg-text-muted">
                                {run.commit_sha?.substring(0, 7) || "-"}
                              </code>
                              <p className="text-sm text-lg-text truncate max-w-[200px]">
                                {run.commit_message || "(no message)"}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <code className="text-xs font-mono text-lg-text-secondary bg-lg-surface-2 px-1.5 py-0.5 rounded">
                              {run.branch}
                            </code>
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant={config.badge}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {run.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-sm text-lg-text-secondary">
                            {run.passed_checks}/{run.total_checks}
                          </td>
                          <td className="py-3 px-2 text-sm text-lg-text-secondary">
                            {run.commit_author || "Unknown"}
                            {run.is_agent_commit && (
                              <Badge variant="outline" className="ml-1 text-xs">
                                Agent
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-2 text-sm text-lg-text-muted">
                            {formatDate(run.created_at)}
                          </td>
                          <td className="py-3 px-2">
                            {run.status !== "passed" && run.status !== "pass" && (
                              <Button size="sm" variant="outline" className="text-xs">
                                Approve
                              </Button>
                            )}
                          </td>
                        </tr>
                        {isExpanded && run.results && (
                          <tr>
                            <td colSpan={8} className="bg-lg-surface-2 px-8 py-4">
                              <div className="space-y-2">
                                {run.results.length === 0 ? (
                                  <p className="text-sm text-lg-text-muted text-center py-2">
                                    No individual check results available.
                                  </p>
                                ) : (
                                  run.results.map((result) => {
                                    const rConfig = getConfig(result.status);
                                    const RIcon = rConfig.icon;
                                    return (
                                      <div
                                        key={result.id}
                                        className="flex items-center justify-between rounded-lg bg-lg-surface border border-lg-border px-4 py-2.5"
                                      >
                                        <div className="flex items-center gap-3">
                                          <RIcon
                                            className={`h-4 w-4 ${rConfig.color}`}
                                          />
                                          <span className="text-sm font-medium text-lg-text">
                                            {result.title}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <span className="text-sm text-lg-text-secondary">
                                            {result.summary || "-"}
                                          </span>
                                          <span className="text-xs text-lg-text-muted">
                                            {formatDuration(result.duration_ms)}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
