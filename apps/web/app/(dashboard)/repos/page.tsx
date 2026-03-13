"use client";

import { useState } from "react";
import Link from "next/link";
import {
  GitFork,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const repos = [
  {
    id: "1",
    name: "acme/frontend",
    description: "Next.js web application",
    lastStatus: "passed" as const,
    checkCount: 342,
    health: "green" as const,
    lastCheck: "2 min ago",
    language: "TypeScript",
  },
  {
    id: "2",
    name: "acme/api-server",
    description: "Express REST API with PostgreSQL",
    lastStatus: "failed" as const,
    checkCount: 189,
    health: "red" as const,
    lastCheck: "12 min ago",
    language: "TypeScript",
  },
  {
    id: "3",
    name: "acme/shared-lib",
    description: "Shared utilities and types",
    lastStatus: "warning" as const,
    checkCount: 97,
    health: "yellow" as const,
    lastCheck: "28 min ago",
    language: "TypeScript",
  },
  {
    id: "4",
    name: "acme/mobile-app",
    description: "React Native mobile application",
    lastStatus: "passed" as const,
    checkCount: 156,
    health: "green" as const,
    lastCheck: "1 hour ago",
    language: "TypeScript",
  },
  {
    id: "5",
    name: "acme/docs",
    description: "Documentation site (Docusaurus)",
    lastStatus: "passed" as const,
    checkCount: 43,
    health: "green" as const,
    lastCheck: "2 hours ago",
    language: "MDX",
  },
  {
    id: "6",
    name: "acme/infra",
    description: "Infrastructure as code (Terraform)",
    lastStatus: "passed" as const,
    checkCount: 78,
    health: "green" as const,
    lastCheck: "3 hours ago",
    language: "HCL",
  },
];

const statusConfig = {
  passed: { icon: CheckCircle, color: "text-emerald-500", label: "Passing" },
  failed: { icon: XCircle, color: "text-red-500", label: "Failing" },
  warning: { icon: AlertTriangle, color: "text-amber-500", label: "Warning" },
};

const healthColors = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

export default function ReposPage() {
  const [search, setSearch] = useState("");

  const filtered = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repositories</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage connected repositories and their check configurations
          </p>
        </div>
        <Button className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Connect Repo
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search repositories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((repo) => {
          const status = statusConfig[repo.lastStatus];
          const StatusIcon = status.icon;
          return (
            <Link key={repo.id} href={`/repos/${repo.id}`}>
              <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GitFork className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-900">
                        {repo.name}
                      </span>
                    </div>
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${healthColors[repo.health]}`}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    {repo.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={`h-3.5 w-3.5 ${status.color}`} />
                      <span className="text-xs font-medium text-gray-600">
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{repo.checkCount} checks</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {repo.lastCheck}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <Badge variant="outline" className="text-xs">
                      {repo.language}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
