"use client";

import Link from "next/link";
import {
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
  Bot,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const pendingReviews = [
  {
    id: "run-101",
    repo: "acme/api-server",
    prTitle: "feat: add rate limiting middleware",
    prNumber: 142,
    branch: "feat/rate-limit",
    status: "failed" as const,
    failureCount: 2,
    warningCount: 1,
    agent: "Cursor",
    timestamp: "12 min ago",
    checks: {
      secrets: "failed",
      lint: "failed",
      deps: "warning",
    },
  },
  {
    id: "run-102",
    repo: "acme/shared-lib",
    prTitle: "refactor: extract validation utils",
    prNumber: 87,
    branch: "refactor/utils",
    status: "warning" as const,
    failureCount: 0,
    warningCount: 2,
    agent: "Copilot",
    timestamp: "28 min ago",
    checks: {
      duplicates: "warning",
      lint: "warning",
    },
  },
  {
    id: "run-103",
    repo: "acme/frontend",
    prTitle: "feat: implement OAuth2 PKCE flow",
    prNumber: 256,
    branch: "feat/oauth-pkce",
    status: "failed" as const,
    failureCount: 1,
    warningCount: 0,
    agent: "Devin",
    timestamp: "1 hour ago",
    checks: {
      build: "failed",
    },
  },
  {
    id: "run-104",
    repo: "acme/analytics",
    prTitle: "fix: correct event tracking payload",
    prNumber: 34,
    branch: "fix/event-tracking",
    status: "warning" as const,
    failureCount: 0,
    warningCount: 1,
    agent: "Claude",
    timestamp: "2 hours ago",
    checks: {
      patterns: "warning",
    },
  },
];

export default function ReviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pending Reviews</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pull requests flagged by LastGate that require human review
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                    Repository
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                    Pull Request
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                    Agent
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                    Issues
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                    Time
                  </th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingReviews.map((review) => (
                  <tr
                    key={review.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      {review.status === "failed" ? (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Failed
                        </Badge>
                      ) : (
                        <Badge variant="warning">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Warning
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium text-gray-900">
                        {review.repo}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <span className="text-sm text-gray-900">
                          {review.prTitle}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">
                            #{review.prNumber}
                          </span>
                          <code className="text-xs font-mono text-gray-400 bg-gray-100 px-1 py-0.5 rounded">
                            {review.branch}
                          </code>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Bot className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {review.agent}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {review.failureCount > 0 && (
                          <span className="text-xs font-medium text-red-600">
                            {review.failureCount} failed
                          </span>
                        )}
                        {review.warningCount > 0 && (
                          <span className="text-xs font-medium text-amber-600">
                            {review.warningCount} warnings
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        {review.timestamp}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/review/${review.id}`}>
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
