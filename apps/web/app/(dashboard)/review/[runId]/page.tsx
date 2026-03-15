"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Bot,
  FileCode,
  Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CheckAnnotations from "@/components/review/CheckAnnotations";
import ReviewActions from "@/components/review/ReviewActions";
import AgentFeedback from "@/components/review/AgentFeedback";

interface Annotation {
  file: string;
  line: number;
  severity: "error" | "warning";
  message: string;
}

interface CheckResult {
  id: string;
  check_run_id: string;
  check_type: string;
  status: string;
  title: string;
  summary: string | null;
  details: Record<string, unknown>;
  duration_ms: number | null;
  created_at: string;
}

interface CheckRunDetail {
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
  results: CheckResult[];
}

const statusConfig = {
  pass: { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50", label: "Passed" },
  passed: { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50", label: "Passed" },
  fail: { icon: XCircle, color: "text-red-500", bg: "bg-red-50", label: "Failed" },
  failed: { icon: XCircle, color: "text-red-500", bg: "bg-red-50", label: "Failed" },
  warn: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50", label: "Warning" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50", label: "Warning" },
} as const;

function getStatusConfig(status: string) {
  return (
    statusConfig[status as keyof typeof statusConfig] || {
      icon: AlertTriangle,
      color: "text-gray-500",
      bg: "bg-gray-50",
      label: status,
    }
  );
}

function extractAnnotations(result: CheckResult): Annotation[] {
  const details = result.details;
  if (!details) return [];

  // Support details.annotations array or details.findings array
  const items = (details as { annotations?: Annotation[]; findings?: Annotation[] }).annotations
    || (details as { findings?: Annotation[] }).findings;

  if (Array.isArray(items)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return items.map((item: any) => {
      const entry = item;
      return {
        file: (entry.file as string) || (entry.path as string) || "unknown",
        line: (entry.line as number) || 0,
        severity:
          (entry.severity as string) === "error" || (entry.severity as string) === "warning"
            ? (entry.severity as "error" | "warning")
            : result.status === "fail" || result.status === "failed"
              ? ("error" as const)
              : ("warning" as const),
        message: (entry.message as string) || (entry.description as string) || "",
      };
    });
  }

  return [];
}

function normalizeStatus(status: string): "passed" | "failed" | "warning" {
  if (status === "fail" || status === "failed") return "failed";
  if (status === "warn" || status === "warning") return "warning";
  return "passed";
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function ReviewDetailPage() {
  const params = useParams();
  const runId = params.runId as string;

  const [checkRun, setCheckRun] = useState<CheckRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCheck, setActiveCheck] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCheckRun() {
      try {
        const res = await fetch(`/api/checks/${runId}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Check run not found");
          }
          throw new Error(`Failed to fetch check run: ${res.status}`);
        }
        const data: CheckRunDetail = await res.json();
        setCheckRun(data);
        // Auto-select first failed result, or first result
        const firstFailed = data.results.find(
          (r) => r.status === "fail" || r.status === "failed"
        );
        setActiveCheck(firstFailed?.id || data.results[0]?.id || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load check run");
      } finally {
        setLoading(false);
      }
    }

    fetchCheckRun();
  }, [runId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/review">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">
            Loading check run details...
          </span>
        </div>
      </div>
    );
  }

  if (error || !checkRun) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/review">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Error</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <XCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900">
              {error || "Check run not found"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeResult = checkRun.results.find((r) => r.id === activeCheck);
  const annotations = activeResult ? extractAnnotations(activeResult) : [];

  const overallBadge =
    checkRun.failed_checks > 0
      ? { variant: "destructive" as const, label: "Failed" }
      : checkRun.warned_checks > 0
        ? { variant: "warning" as const, label: "Warning" }
        : { variant: "default" as const, label: checkRun.status };

  // Map results to the shape AgentFeedback expects (failed + warned)
  const failedAndWarnedChecks = checkRun.results
    .filter((r) => r.status === "fail" || r.status === "failed" || r.status === "warn" || r.status === "warning")
    .map((r) => ({
      name: r.title,
      status: normalizeStatus(r.status),
      message: r.summary || "",
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/review">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {checkRun.commit_message
                ? checkRun.commit_message.length > 80
                  ? checkRun.commit_message.slice(0, 80) + "..."
                  : checkRun.commit_message
                : checkRun.commit_sha.slice(0, 8)}
            </h1>
            <Badge variant={overallBadge.variant}>{overallBadge.label}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            {checkRun.pr_number && <span>#{checkRun.pr_number}</span>}
            <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
              {checkRun.branch}
            </code>
            <code className="font-mono text-xs text-gray-400">
              {checkRun.commit_sha.slice(0, 8)}
            </code>
            {checkRun.commit_author && (
              <div className="flex items-center gap-1">
                {checkRun.is_agent_commit && <Bot className="h-3.5 w-3.5" />}
                {checkRun.commit_author}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Check results sidebar */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
            Check Results
          </h2>
          {checkRun.results.length === 0 ? (
            <p className="text-sm text-gray-500">No check results available.</p>
          ) : (
            checkRun.results.map((result) => {
              const config = getStatusConfig(result.status);
              const StatusIcon = config.icon;
              const isActive = activeCheck === result.id;
              return (
                <button
                  key={result.id}
                  onClick={() => setActiveCheck(result.id)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${config.bg} shrink-0`}
                  >
                    <StatusIcon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {result.title}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {result.summary || result.check_type}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDuration(result.duration_ms)}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Annotations */}
        <div className="lg:col-span-2 space-y-6">
          {activeResult && annotations.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileCode className="h-4 w-4" />
                  {activeResult.title} -- Findings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CheckAnnotations annotations={annotations} />
              </CardContent>
            </Card>
          ) : activeResult ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900">
                  No issues found
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {activeResult.summary || "Check passed"}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {/* Actions */}
          <ReviewActions runId={runId} />

          {/* Agent Feedback Preview */}
          <AgentFeedback
            agent={checkRun.commit_author || "Agent"}
            failedChecks={failedAndWarnedChecks}
          />
        </div>
      </div>
    </div>
  );
}
