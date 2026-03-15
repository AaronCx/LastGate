"use client";

import OverviewCards from "@/components/dashboard/OverviewCards";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import RepoHealthGrid from "@/components/dashboard/RepoHealthGrid";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-sans text-lg-text">Dashboard</h1>
        <p className="text-sm text-lg-text-secondary mt-1">
          Monitor AI agent commits across all your repositories
        </p>
      </div>

      <OverviewCards />
      <RepoHealthGrid />
      <ActivityFeed />
    </div>
  );
}
