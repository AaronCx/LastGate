"use client";

import { CheckCircle, XCircle, ShieldAlert, GitFork } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const stats = [
  {
    label: "Total Checks Today",
    value: "1,284",
    change: "+12%",
    changeType: "positive" as const,
    icon: CheckCircle,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50",
  },
  {
    label: "Pass Rate",
    value: "94.2%",
    change: "+2.1%",
    changeType: "positive" as const,
    icon: CheckCircle,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-50",
  },
  {
    label: "Blocked Commits",
    value: "23",
    change: "-8%",
    changeType: "positive" as const,
    icon: ShieldAlert,
    iconColor: "text-red-500",
    iconBg: "bg-red-50",
  },
  {
    label: "Active Repos",
    value: "18",
    change: "+3",
    changeType: "neutral" as const,
    icon: GitFork,
    iconColor: "text-violet-500",
    iconBg: "bg-violet-50",
  },
];

export default function OverviewCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
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
            <p className="mt-2 text-xs font-medium text-emerald-600">
              {stat.change} from last week
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
