"use client";

import { useEffect, useState } from "react";
import { CheckCircle, ShieldAlert, GitFork, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface OverviewStats {
  totalChecks: number;
  passRate: number;
  blockedCommits: number;
  activeRepos: number;
}

export default function OverviewCards() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [analyticsRes, reposRes] = await Promise.all([
          fetch("/api/analytics?range=7d"),
          fetch("/api/repos"),
        ]);
        const analytics = await analyticsRes.json();
        const repos = await reposRes.json();

        const totalChecks = analytics.summary?.totalRuns || 0;
        const passed = analytics.summary?.passedRuns || 0;
        const passRate = totalChecks > 0 ? Math.round((passed / totalChecks) * 1000) / 10 : 0;
        const blocked = analytics.summary?.failedRuns || 0;

        setStats({
          totalChecks,
          passRate,
          blockedCommits: blocked,
          activeRepos: Array.isArray(repos) ? repos.filter((r: Record<string, unknown>) => r.is_active).length : 0,
        });
      } catch {
        setStats({ totalChecks: 0, passRate: 0, blockedCommits: 0, activeRepos: 0 });
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5 flex items-center justify-center h-24">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Total Checks (7d)",
      value: stats?.totalChecks.toLocaleString() || "0",
      icon: CheckCircle,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-50",
    },
    {
      label: "Pass Rate",
      value: `${stats?.passRate || 0}%`,
      icon: CheckCircle,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-50",
    },
    {
      label: "Blocked Commits",
      value: stats?.blockedCommits.toLocaleString() || "0",
      icon: ShieldAlert,
      iconColor: "text-red-500",
      iconBg: "bg-red-50",
    },
    {
      label: "Active Repos",
      value: stats?.activeRepos.toLocaleString() || "0",
      icon: GitFork,
      iconColor: "text-violet-500",
      iconBg: "bg-violet-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.iconBg}`}
              >
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
