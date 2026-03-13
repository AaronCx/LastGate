import OverviewCards from "@/components/dashboard/OverviewCards";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import RepoHealthGrid from "@/components/dashboard/RepoHealthGrid";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor AI agent commits across all your repositories
        </p>
      </div>

      <OverviewCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Checks today</span>
              <span className="text-sm font-semibold text-gray-900">1,284</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Secrets caught</span>
              <span className="text-sm font-semibold text-red-600">7</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Lint errors blocked</span>
              <span className="text-sm font-semibold text-amber-600">31</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Build failures</span>
              <span className="text-sm font-semibold text-red-600">4</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Agent sessions</span>
              <span className="text-sm font-semibold text-gray-900">42</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg check time</span>
              <span className="text-sm font-semibold text-gray-900">3.2s</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Repository Health</CardTitle>
        </CardHeader>
        <CardContent>
          <RepoHealthGrid />
        </CardContent>
      </Card>
    </div>
  );
}
