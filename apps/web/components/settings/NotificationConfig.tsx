"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Bell, Trash2, TestTube, Plus } from "lucide-react";

interface NotificationConfigEntry {
  id: string;
  provider: "slack" | "discord";
  webhook_url: string;
  notify_on: string;
  throttle_minutes: number;
  is_active: boolean;
}

interface NotificationConfigProps {
  repoId: string;
}

export default function NotificationConfig({ repoId }: NotificationConfigProps) {
  const [configs, setConfigs] = useState<NotificationConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newProvider, setNewProvider] = useState<"slack" | "discord">("slack");
  const [newUrl, setNewUrl] = useState("");
  const [newNotifyOn, setNewNotifyOn] = useState("fail_only");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/notifications?repo_id=${repoId}`)
      .then((res) => res.json())
      .then((data) => setConfigs(data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [repoId]);

  const handleAdd = async () => {
    if (!newUrl) return;
    const res = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repo_id: repoId,
        provider: newProvider,
        webhook_url: newUrl,
        notify_on: newNotifyOn,
      }),
    });
    if (res.ok) {
      const { data } = await res.json();
      setConfigs((prev) => [data, ...prev]);
      setShowAdd(false);
      setNewUrl("");
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setConfigs((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config_id: id }),
      });
      setTestResult(res.ok ? "sent" : "failed");
    } catch {
      setTestResult("failed");
    } finally {
      setTestingId(null);
    }
  };

  return (
    <Card className="!bg-lg-surface !border-lg-border !ring-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Notifications
        </CardTitle>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-lg-accent text-white hover:bg-lg-accent/80"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Webhook
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAdd && (
          <div className="p-4 rounded-lg border border-lg-border space-y-3">
            <div className="flex gap-2">
              <select
                value={newProvider}
                onChange={(e) => setNewProvider(e.target.value as "slack" | "discord")}
                className="px-3 py-2 text-sm border border-lg-border rounded-lg bg-lg-surface text-lg-text"
              >
                <option value="slack">Slack</option>
                <option value="discord">Discord</option>
              </select>
              <select
                value={newNotifyOn}
                onChange={(e) => setNewNotifyOn(e.target.value)}
                className="px-3 py-2 text-sm border border-lg-border rounded-lg bg-lg-surface text-lg-text"
              >
                <option value="fail_only">Failures only</option>
                <option value="fail_and_warn">Failures & warnings</option>
                <option value="all">All results</option>
              </select>
            </div>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="Webhook URL"
              className="w-full px-3 py-2 text-sm border border-lg-border rounded-lg bg-lg-surface text-lg-text"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-lg-border text-lg-text-secondary hover:bg-lg-surface-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-lg-text-muted">Loading...</p>
        ) : configs.length === 0 ? (
          <p className="text-sm text-lg-text-muted">No notification webhooks configured</p>
        ) : (
          configs.map((config) => (
            <div
              key={config.id}
              className="flex items-center justify-between p-3 rounded-lg bg-lg-surface-2"
            >
              <div>
                <p className="text-sm font-medium text-lg-text-secondary capitalize">
                  {config.provider}
                </p>
                <p className="text-xs text-lg-text-muted">
                  {config.notify_on.replace("_", " ")} &middot; {config.throttle_minutes}m throttle
                </p>
              </div>
              <div className="flex items-center gap-2">
                {testResult && testingId === null && (
                  <span className={`text-xs ${testResult === "sent" ? "text-lg-pass" : "text-lg-fail"}`}>
                    {testResult === "sent" ? "Sent!" : "Failed"}
                  </span>
                )}
                <button
                  onClick={() => handleTest(config.id)}
                  disabled={testingId === config.id}
                  className="p-1.5 text-lg-text-muted hover:text-lg-accent transition-colors"
                  title="Send test notification"
                >
                  <TestTube className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(config.id)}
                  className="p-1.5 text-lg-text-muted hover:text-lg-fail transition-colors"
                  title="Delete webhook"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
