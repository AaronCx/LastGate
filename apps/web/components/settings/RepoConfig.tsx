"use client";

import { useState, useEffect, useCallback } from "react";
import { GitFork, Loader2 } from "lucide-react";

interface RepoCheck {
  enabled: boolean;
}

interface RepoConfig {
  checks?: {
    secrets?: RepoCheck;
    duplicates?: RepoCheck;
    lint?: RepoCheck;
    build?: RepoCheck;
    dependencies?: RepoCheck;
    patterns?: RepoCheck;
  };
}

interface Repo {
  id: string;
  full_name: string;
  is_active: boolean;
  config: RepoConfig;
  default_branch: string;
}

export default function RepoConfig() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchRepos = useCallback(async () => {
    try {
      const res = await fetch("/api/repos");
      if (!res.ok) throw new Error("Failed to fetch repositories");
      const { data } = await res.json();
      setRepos(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load repositories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  const toggleRepo = async (repo: Repo) => {
    setTogglingId(repo.id);
    const newActive = !repo.is_active;

    // Optimistic update
    setRepos((prev) =>
      prev.map((r) =>
        r.id === repo.id ? { ...r, is_active: newActive } : r
      )
    );

    try {
      const res = await fetch("/api/repos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: repo.id, is_active: newActive }),
      });

      if (!res.ok) {
        // Revert on failure
        setRepos((prev) =>
          prev.map((r) =>
            r.id === repo.id ? { ...r, is_active: !newActive } : r
          )
        );
      }
    } catch {
      // Revert on error
      setRepos((prev) =>
        prev.map((r) =>
          r.id === repo.id ? { ...r, is_active: !newActive } : r
        )
      );
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Loading repositories...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 py-4 text-center">{error}</div>
    );
  }

  if (repos.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-4 text-center">
        No repositories connected. Install the LastGate GitHub App to get started.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {repos.map((repo) => (
        <div
          key={repo.id}
          className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <GitFork className="h-4 w-4 text-gray-400" />
            <div>
              <span className="text-sm font-medium text-gray-900">
                {repo.full_name}
              </span>
              <span className="text-xs text-gray-400 ml-2">
                {repo.default_branch}
              </span>
            </div>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={repo.is_active}
              onChange={() => toggleRepo(repo)}
              disabled={togglingId === repo.id}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-primary/20 peer-disabled:opacity-50" />
          </label>
        </div>
      ))}
    </div>
  );
}
