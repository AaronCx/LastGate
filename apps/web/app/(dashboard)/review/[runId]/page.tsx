"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Bot,
  FileCode,
  MessageSquare,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CheckAnnotations from "@/components/review/CheckAnnotations";
import ReviewActions from "@/components/review/ReviewActions";
import AgentFeedback from "@/components/review/AgentFeedback";

const checkResults = [
  {
    name: "Secret Scanner",
    status: "failed" as const,
    message: "Found 1 hardcoded API key",
    duration: "0.9s",
    annotations: [
      {
        file: "src/middleware/rate-limit.ts",
        line: 23,
        severity: "error" as const,
        message: "Hardcoded API key detected: `sk_test_...` — use environment variables instead.",
      },
    ],
  },
  {
    name: "Lint & Type Check",
    status: "failed" as const,
    message: "3 errors, 2 warnings",
    duration: "2.4s",
    annotations: [
      {
        file: "src/middleware/rate-limit.ts",
        line: 5,
        severity: "error" as const,
        message: "'RateLimitConfig' is declared but its value is never read. (TS6133)",
      },
      {
        file: "src/middleware/rate-limit.ts",
        line: 18,
        severity: "error" as const,
        message: "Missing return type on function. (eslint: @typescript-eslint/explicit-function-return-type)",
      },
      {
        file: "src/middleware/rate-limit.ts",
        line: 42,
        severity: "error" as const,
        message: "Unexpected 'any'. Specify a different type. (eslint: @typescript-eslint/no-explicit-any)",
      },
      {
        file: "src/utils/helpers.ts",
        line: 8,
        severity: "warning" as const,
        message: "'formatDate' is defined but never used. (TS6133)",
      },
      {
        file: "src/utils/helpers.ts",
        line: 15,
        severity: "warning" as const,
        message: "Prefer 'const' over 'let' when variable is never reassigned. (eslint: prefer-const)",
      },
    ],
  },
  {
    name: "Dependency Audit",
    status: "warning" as const,
    message: "1 deprecated dependency",
    duration: "0.6s",
    annotations: [
      {
        file: "package.json",
        line: 12,
        severity: "warning" as const,
        message: "express-rate-limit@5.x is deprecated. Upgrade to v7 for security fixes.",
      },
    ],
  },
  {
    name: "Duplicate Detector",
    status: "passed" as const,
    message: "No duplicates found",
    duration: "1.1s",
    annotations: [],
  },
  {
    name: "Build Verifier",
    status: "passed" as const,
    message: "Build successful",
    duration: "4.1s",
    annotations: [],
  },
  {
    name: "Agent Patterns",
    status: "warning" as const,
    message: "Similar pattern to previous failed commit",
    duration: "0.4s",
    annotations: [
      {
        file: "src/middleware/rate-limit.ts",
        line: 1,
        severity: "warning" as const,
        message: "This file structure closely matches a previously rejected commit by the same agent. Review carefully.",
      },
    ],
  },
];

const statusConfig = {
  passed: { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50" },
  failed: { icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50" },
};

export default function ReviewDetailPage() {
  const [activeCheck, setActiveCheck] = useState<string | null>("Secret Scanner");

  const activeResult = checkResults.find((c) => c.name === activeCheck);

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
              feat: add rate limiting middleware
            </h1>
            <Badge variant="destructive">Failed</Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            <span>acme/api-server</span>
            <span>#142</span>
            <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
              feat/rate-limit
            </code>
            <div className="flex items-center gap-1">
              <Bot className="h-3.5 w-3.5" />
              Cursor
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Check results sidebar */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
            Check Results
          </h2>
          {checkResults.map((check) => {
            const config = statusConfig[check.status];
            const StatusIcon = config.icon;
            const isActive = activeCheck === check.name;
            return (
              <button
                key={check.name}
                onClick={() => setActiveCheck(check.name)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  isActive
                    ? "bg-blue-50 border border-blue-200"
                    : "hover:bg-gray-50 border border-transparent"
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${config.bg} shrink-0`}>
                  <StatusIcon className={`h-4 w-4 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {check.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {check.message}
                  </p>
                </div>
                <span className="text-xs text-gray-400">{check.duration}</span>
              </button>
            );
          })}
        </div>

        {/* Annotations */}
        <div className="lg:col-span-2 space-y-6">
          {activeResult && activeResult.annotations.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileCode className="h-4 w-4" />
                  {activeResult.name} — Findings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CheckAnnotations annotations={activeResult.annotations} />
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
                  {activeResult.message}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {/* Actions */}
          <ReviewActions />

          {/* Agent Feedback Preview */}
          <AgentFeedback
            agent="Cursor"
            failedChecks={checkResults.filter((c) => c.status === "failed")}
          />
        </div>
      </div>
    </div>
  );
}
