"use client";

import { useState } from "react";
import { GitFork } from "lucide-react";

const initialRepos = [
  { name: "acme/frontend", enabled: true },
  { name: "acme/api-server", enabled: true },
  { name: "acme/shared-lib", enabled: true },
  { name: "acme/mobile-app", enabled: true },
  { name: "acme/docs", enabled: false },
  { name: "acme/infra", enabled: true },
  { name: "acme/analytics", enabled: false },
  { name: "acme/auth-service", enabled: true },
];

export default function RepoConfig() {
  const [repos, setRepos] = useState(initialRepos);

  const toggle = (name: string) => {
    setRepos((prev) =>
      prev.map((r) => (r.name === name ? { ...r, enabled: !r.enabled } : r))
    );
  };

  return (
    <div className="space-y-1">
      {repos.map((repo) => (
        <div
          key={repo.name}
          className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <GitFork className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-900">
              {repo.name}
            </span>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={repo.enabled}
              onChange={() => toggle(repo.name)}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-primary/20" />
          </label>
        </div>
      ))}
    </div>
  );
}
