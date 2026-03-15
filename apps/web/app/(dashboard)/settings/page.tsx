"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import RepoConfig from "@/components/settings/RepoConfig";
import ApiKeyManager from "@/components/settings/ApiKeyManager";
import NotificationPrefs from "@/components/settings/NotificationPrefs";
import NotificationConfig from "@/components/settings/NotificationConfig";
import BadgeGenerator from "@/components/settings/BadgeGenerator";

interface Repo {
  id: string;
  full_name: string;
}

export default function SettingsPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");
  const [selectedRepoName, setSelectedRepoName] = useState<string>("");

  useEffect(() => {
    fetch("/api/repos")
      .then((res) => res.json())
      .then(({ data }) => {
        if (data && data.length > 0) {
          setRepos(data);
          setSelectedRepoId(data[0].id);
          setSelectedRepoName(data[0].full_name);
        }
      })
      .catch(console.error);
  }, []);

  const handleRepoSelect = (repoId: string) => {
    setSelectedRepoId(repoId);
    const repo = repos.find((r) => r.id === repoId);
    if (repo) setSelectedRepoName(repo.full_name);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-lg-text">Settings</h1>
        <p className="text-sm text-lg-text-muted mt-1">
          Configure repositories, API keys, and notification preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Connected Repos */}
        <Card className="!bg-lg-surface !border-lg-border !ring-0">
          <CardHeader>
            <CardTitle className="text-lg">Connected Repositories</CardTitle>
            <CardDescription>
              Toggle LastGate checks for each of your repositories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RepoConfig />
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card className="!bg-lg-surface !border-lg-border !ring-0">
          <CardHeader>
            <CardTitle className="text-lg">API Keys</CardTitle>
            <CardDescription>
              Generate keys for CLI authentication and external integrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ApiKeyManager />
          </CardContent>
        </Card>

        {/* Global Rule Defaults */}
        <Card className="!bg-lg-surface !border-lg-border !ring-0">
          <CardHeader>
            <CardTitle className="text-lg">Global Rule Defaults</CardTitle>
            <CardDescription>
              Default check configuration for newly connected repos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Secret Scanner", desc: "Detect leaked secrets and credentials", defaultEnabled: true },
                { name: "Duplicate Detector", desc: "Identify code duplication", defaultEnabled: true },
                { name: "Lint & Type Check", desc: "Run linter and type checker", defaultEnabled: true },
                { name: "Build Verifier", desc: "Verify the project builds", defaultEnabled: false },
                { name: "Dependency Audit", desc: "Scan dependencies for vulnerabilities", defaultEnabled: true },
                { name: "Agent Pattern Analysis", desc: "Track and analyze agent behavior", defaultEnabled: true },
              ].map((rule) => (
                <div
                  key={rule.name}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-lg-text">
                      {rule.name}
                    </p>
                    <p className="text-xs text-lg-text-muted">{rule.desc}</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      defaultChecked={rule.defaultEnabled}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-lg-surface-2 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-lg-border after:bg-lg-surface after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-primary/20" />
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="!bg-lg-surface !border-lg-border !ring-0">
          <CardHeader>
            <CardTitle className="text-lg">Notifications</CardTitle>
            <CardDescription>
              Choose how and when you want to be notified
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationPrefs />
          </CardContent>
        </Card>

        {/* Per-repo Notification Config */}
        {repos.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-lg-text-secondary">
                Repository:
              </label>
              <select
                value={selectedRepoId}
                onChange={(e) => handleRepoSelect(e.target.value)}
                className="px-3 py-2 text-sm border border-lg-border rounded-lg bg-lg-surface text-lg-text"
              >
                {repos.map((repo) => (
                  <option key={repo.id} value={repo.id}>
                    {repo.full_name}
                  </option>
                ))}
              </select>
            </div>
            <NotificationConfig repoId={selectedRepoId} />
          </div>
        )}

        {/* Badge Generator */}
        {selectedRepoName && (
          <BadgeGenerator repoFullName={selectedRepoName} />
        )}
      </div>
    </div>
  );
}
