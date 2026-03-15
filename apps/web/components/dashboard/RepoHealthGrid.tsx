"use client";

import { GitFork, ShieldCheck, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const repos = [
  { name: "acme/frontend", health: "green" as const, checks: 342, lastCheck: "2m ago", branchProtectionEnabled: true },
  { name: "acme/api-server", health: "red" as const, checks: 189, lastCheck: "12m ago", branchProtectionEnabled: true },
  { name: "acme/shared-lib", health: "yellow" as const, checks: 97, lastCheck: "28m ago", branchProtectionEnabled: false },
  { name: "acme/mobile-app", health: "green" as const, checks: 156, lastCheck: "1h ago", branchProtectionEnabled: true },
  { name: "acme/docs", health: "green" as const, checks: 43, lastCheck: "2h ago", branchProtectionEnabled: false },
  { name: "acme/infra", health: "green" as const, checks: 78, lastCheck: "3h ago", branchProtectionEnabled: true },
  { name: "acme/analytics", health: "yellow" as const, checks: 64, lastCheck: "4h ago", branchProtectionEnabled: false },
  { name: "acme/auth-service", health: "green" as const, checks: 112, lastCheck: "5h ago", branchProtectionEnabled: true },
];

const healthColors = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

const healthLabels = {
  green: "Healthy",
  yellow: "Warnings",
  red: "Failing",
};

export default function RepoHealthGrid() {
  const enableBranchProtection = (repoName: string) => {
    // TODO: Call API to enable branch protection
    console.log(`Enabling branch protection for ${repoName}`);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {repos.map((repo) => (
        <Card
          key={repo.name}
          className="hover:shadow-md transition-shadow cursor-pointer"
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <GitFork className="h-4 w-4 text-gray-400" />
              <div className="flex items-center gap-1.5">
                <div
                  className={`h-2 w-2 rounded-full ${healthColors[repo.health]}`}
                />
                <span className="text-xs text-gray-500">
                  {healthLabels[repo.health]}
                </span>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-900 truncate">
              {repo.name}
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>{repo.checks} checks</span>
              <span>{repo.lastCheck}</span>
            </div>
            <div className="mt-2">
              {repo.branchProtectionEnabled ? (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <ShieldCheck size={14} /> Protected
                </span>
              ) : (
                <button
                  onClick={() => enableBranchProtection(repo.name)}
                  className="text-xs text-yellow-400 flex items-center gap-1 hover:underline"
                >
                  <ShieldAlert size={14} /> Not protected — click to enable
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
