"use client";

import { useEffect, useState } from "react";
import OverviewCards from "@/components/dashboard/OverviewCards";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Link from "next/link";

interface RecentCheck {
  id: string;
  commit_sha: string;
  commit_message: string;
  commit_author: string;
  status: string;
  branch: string;
  created_at: string;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  is_agent_commit: boolean;
  repo_id: string;
}

export default function OverviewPage() {
  const [recentChecks, setRecentChecks] = useState<RecentCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecent() {
      try {
        const res = await fetch("/api/checks?limit=10");
        if (res.ok) {
          const data = await res.json();
          setRecentChecks(Array.isArray(data) ? data : data.data || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchRecent();
  }, []);

  const statusColor = (status: string) => {
    switch (status) {
      case "passed": return "text-emerald-600 bg-emerald-50";
      case "failed": return "text-red-600 bg-red-50";
      case "warned": return "text-amber-600 bg-amber-50";
      case "running": return "text-blue-600 bg-blue-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor AI agent commits across all your repositories
        </p>
      </div>

      <OverviewCards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : recentChecks.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No check runs yet. Push code to a connected repo to see activity here.
              </p>
            ) : (
              <div className="space-y-3">
                {recentChecks.slice(0, 8).map((check) => (
                  <Link
                    key={check.id}
                    href={`/review/${check.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {check.commit_message || check.commit_sha?.slice(0, 7)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {check.commit_author}
                        {check.is_agent_commit && (
                          <span className="ml-1 inline-flex items-center rounded-full bg-purple-50 px-1.5 py-0.5 text-xs text-purple-600">
                            agent
                          </span>
                        )}
                        {" on "}
                        {check.branch}
                      </p>
                    </div>
                    <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(check.status)}`}>
                      {check.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Checks today</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {recentChecks.filter((c) => {
                      const d = new Date(c.created_at);
                      const today = new Date();
                      return d.toDateString() === today.toDateString();
                    }).length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Failed checks</span>
                  <span className="text-sm font-semibold text-red-600">
                    {recentChecks.filter((c) => c.status === "failed").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Agent commits</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {recentChecks.filter((c) => c.is_agent_commit).length}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
