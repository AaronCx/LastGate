"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import RepoConfig from "@/components/settings/RepoConfig";
import ApiKeyManager from "@/components/settings/ApiKeyManager";
import NotificationPrefs from "@/components/settings/NotificationPrefs";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure repositories, API keys, and notification preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Connected Repos */}
        <Card>
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
        <Card>
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
        <Card>
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
                    <p className="text-sm font-medium text-gray-900">
                      {rule.name}
                    </p>
                    <p className="text-xs text-gray-500">{rule.desc}</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      defaultChecked={rule.defaultEnabled}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-primary/20" />
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
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
      </div>
    </div>
  );
}
