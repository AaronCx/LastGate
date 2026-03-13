"use client";

import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface CheckResult {
  name: string;
  status: "passed" | "failed" | "warning";
  message: string;
  duration: string;
}

interface CheckRun {
  id: string;
  sha: string;
  branch: string;
  status: "passed" | "failed" | "warning";
  message: string;
  date: string;
  agent: string | null;
  results: CheckResult[];
}

const checkHistory: CheckRun[] = [
  {
    id: "cr-1",
    sha: "a3f8b2c",
    branch: "main",
    status: "passed",
    message: "fix: resolve SSR hydration mismatch",
    date: "2024-01-15 14:32",
    agent: "Claude",
    results: [
      { name: "Secret Scanner", status: "passed", message: "No secrets detected", duration: "0.8s" },
      { name: "Duplicate Detector", status: "passed", message: "No duplicates found", duration: "1.2s" },
      { name: "Lint & Type Check", status: "passed", message: "0 errors, 0 warnings", duration: "2.1s" },
      { name: "Build Verifier", status: "passed", message: "Build successful", duration: "4.3s" },
      { name: "Dependency Audit", status: "passed", message: "All dependencies clean", duration: "0.5s" },
      { name: "Agent Patterns", status: "passed", message: "No concerning patterns", duration: "0.3s" },
    ],
  },
  {
    id: "cr-2",
    sha: "d9e1f4a",
    branch: "feat/rate-limit",
    status: "failed",
    message: "feat: add rate limiting middleware",
    date: "2024-01-15 14:20",
    agent: "Cursor",
    results: [
      { name: "Secret Scanner", status: "failed", message: "Found 1 hardcoded API key in src/middleware/rate-limit.ts:23", duration: "0.9s" },
      { name: "Duplicate Detector", status: "passed", message: "No duplicates found", duration: "1.1s" },
      { name: "Lint & Type Check", status: "failed", message: "3 errors, 2 warnings", duration: "2.4s" },
      { name: "Build Verifier", status: "passed", message: "Build successful", duration: "4.1s" },
      { name: "Dependency Audit", status: "warning", message: "1 deprecated dependency: express-rate-limit@5.x", duration: "0.6s" },
      { name: "Agent Patterns", status: "warning", message: "Similar pattern to previous failed commit", duration: "0.4s" },
    ],
  },
  {
    id: "cr-3",
    sha: "b7c2e8d",
    branch: "refactor/utils",
    status: "warning",
    message: "refactor: extract validation utils",
    date: "2024-01-15 14:04",
    agent: "Copilot",
    results: [
      { name: "Secret Scanner", status: "passed", message: "No secrets detected", duration: "0.7s" },
      { name: "Duplicate Detector", status: "warning", message: "2 similar code blocks detected (82% similarity)", duration: "1.4s" },
      { name: "Lint & Type Check", status: "passed", message: "0 errors, 1 warning", duration: "2.0s" },
      { name: "Build Verifier", status: "passed", message: "Build successful", duration: "3.9s" },
      { name: "Dependency Audit", status: "passed", message: "All dependencies clean", duration: "0.5s" },
      { name: "Agent Patterns", status: "passed", message: "No concerning patterns", duration: "0.3s" },
    ],
  },
  {
    id: "cr-4",
    sha: "e5f9a1b",
    branch: "main",
    status: "passed",
    message: "feat: implement dark mode toggle",
    date: "2024-01-15 13:47",
    agent: "Claude",
    results: [
      { name: "Secret Scanner", status: "passed", message: "No secrets detected", duration: "0.8s" },
      { name: "Duplicate Detector", status: "passed", message: "No duplicates found", duration: "1.0s" },
      { name: "Lint & Type Check", status: "passed", message: "0 errors, 0 warnings", duration: "1.9s" },
      { name: "Build Verifier", status: "passed", message: "Build successful", duration: "4.0s" },
      { name: "Dependency Audit", status: "passed", message: "All dependencies clean", duration: "0.4s" },
      { name: "Agent Patterns", status: "passed", message: "No concerning patterns", duration: "0.3s" },
    ],
  },
];

const statusConfig = {
  passed: { icon: CheckCircle, color: "text-emerald-500", badge: "success" as const },
  failed: { icon: XCircle, color: "text-red-500", badge: "destructive" as const },
  warning: { icon: AlertTriangle, color: "text-amber-500", badge: "warning" as const },
};

export default function RepoDetailPage() {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered =
    statusFilter === "all"
      ? checkHistory
      : checkHistory.filter((c) => c.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/repos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">acme/frontend</h1>
          <p className="text-sm text-gray-500">Next.js web application</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Check History</CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="warning">Warning</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2 w-8" />
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">
                    Commit
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">
                    Branch
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">
                    Checks
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">
                    Agent
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">
                    Date
                  </th>
                  <th className="py-3 px-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((run) => {
                  const config = statusConfig[run.status];
                  const StatusIcon = config.icon;
                  const isExpanded = expandedRows.has(run.id);
                  const passed = run.results.filter(
                    (r) => r.status === "passed"
                  ).length;

                  return (
                    <>
                      <tr
                        key={run.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => toggleRow(run.id)}
                      >
                        <td className="py-3 px-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <div>
                            <code className="text-xs font-mono text-gray-500">
                              {run.sha}
                            </code>
                            <p className="text-sm text-gray-900 truncate max-w-[200px]">
                              {run.message}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <code className="text-xs font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                            {run.branch}
                          </code>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant={config.badge}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {run.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-600">
                          {passed}/{run.results.length}
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-600">
                          {run.agent || "Human"}
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-500">
                          {run.date}
                        </td>
                        <td className="py-3 px-2">
                          {run.status !== "passed" && (
                            <Button size="sm" variant="outline" className="text-xs">
                              Approve
                            </Button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${run.id}-detail`}>
                          <td colSpan={8} className="bg-gray-50 px-8 py-4">
                            <div className="space-y-2">
                              {run.results.map((result) => {
                                const rConfig = statusConfig[result.status];
                                const RIcon = rConfig.icon;
                                return (
                                  <div
                                    key={result.name}
                                    className="flex items-center justify-between rounded-lg bg-white border border-gray-200 px-4 py-2.5"
                                  >
                                    <div className="flex items-center gap-3">
                                      <RIcon
                                        className={`h-4 w-4 ${rConfig.color}`}
                                      />
                                      <span className="text-sm font-medium text-gray-900">
                                        {result.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <span className="text-sm text-gray-600">
                                        {result.message}
                                      </span>
                                      <span className="text-xs text-gray-400">
                                        {result.duration}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
