"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  GitFork,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Repo {
  id: string;
  full_name: string;
  default_branch: string;
  is_active: boolean;
  config: Record<string, unknown>;
  created_at: string;
}

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

function getHealthFromActive(isActive: boolean): "green" | "red" {
  return isActive ? "green" : "red";
}

function getStatusFromActive(isActive: boolean): "passed" | "failed" {
  return isActive ? "passed" : "failed";
}

function formatTimeSince(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

export default function ReposPage() {
  const [search, setSearch] = useState("");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRepos() {
      try {
        const res = await fetch("/api/repos");
        if (!res.ok) {
          throw new Error(`Failed to fetch repositories (${res.status})`);
        }
        const json = await res.json();
        setRepos(json.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load repositories");
      } finally {
        setLoading(false);
      }
    }
    fetchRepos();
  }, []);

  const filtered = repos.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleConnectRepo = () => {
    // Open the GitHub App installation page
    const githubAppSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || "lastgate";
    window.open(
      `https://github.com/apps/${githubAppSlug}/installations/new`,
      "_blank"
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repositories</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage connected repositories and their check configurations
          </p>
        </div>
        <Button className="shrink-0" onClick={handleConnectRepo}>
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

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading repositories...</span>
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-12">
          <GitFork className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            {repos.length === 0
              ? "No repositories connected yet. Click \"Connect Repo\" to get started."
              : "No repositories match your search."}
          </p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((repo) => {
            const health = getHealthFromActive(repo.is_active);
            const lastStatus = getStatusFromActive(repo.is_active);
            const status = statusConfig[lastStatus];
            const StatusIcon = status.icon;
            return (
              <Link key={repo.id} href={`/repos/${repo.id}`}>
                <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <GitFork className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-semibold text-gray-900">
                          {repo.full_name}
                        </span>
                      </div>
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${healthColors[health]}`}
                      />
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                      Branch: {repo.default_branch}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon className={`h-3.5 w-3.5 ${status.color}`} />
                        <span className="text-xs font-medium text-gray-600">
                          {repo.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeSince(repo.created_at)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
