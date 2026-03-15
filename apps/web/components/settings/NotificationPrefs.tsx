"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Bell, Trash2, TestTube, Plus } from "lucide-react";

interface NotificationConfigEntry {
  id: string;
  provider: "slack" | "discord";
  webhook_url: string;
  notify_on: string;
  throttle_minutes: number;
  is_active: boolean;
}

export default function NotificationPrefs() {
  const [configs, setConfigs] = useState<NotificationConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newProvider, setNewProvider] = useState<"slack" | "discord">("slack");
  const [newUrl, setNewUrl] = useState("");
  const [newNotifyOn, setNewNotifyOn] = useState("fail_only");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, "sent" | "failed">>({});

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to fetch notification configs");
      const { data } = await res.json();
      setConfigs(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleAdd = async () => {
    if (!newUrl) return;
    setError(null);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: newProvider,
          webhook_url: newUrl,
          notify_on: newNotifyOn,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to add webhook");
      }
      const { data } = await res.json();
      setConfigs((prev) => [data, ...prev]);
      setShowAdd(false);
      setNewUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add webhook");
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
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config_id: id }),
      });
      setTestResult((prev) => ({ ...prev, [id]: res.ok ? "sent" : "failed" }));
    } catch {
      setTestResult((prev) => ({ ...prev, [id]: "failed" }));
    } finally {
      setTestingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-lg-text-muted">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Loading notification settings...</span>
      </div>
    );
  }

  if (error && configs.length === 0) {
    return (
      <div className="text-sm text-lg-fail py-4 text-center">{error}</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-lg-text-muted">
          <Bell className="h-4 w-4" />
          <span>Webhook notifications for check results</span>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Webhook
        </button>
      </div>

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

      {error && (
        <div className="text-sm text-lg-fail text-center">{error}</div>
      )}

      {configs.length === 0 ? (
        <p className="text-sm text-lg-text-muted text-center py-4">
          No notification webhooks configured yet.
        </p>
      ) : (
        <div className="space-y-2">
          {configs.map((config) => (
            <div
              key={config.id}
              className="flex items-center justify-between p-3 rounded-lg bg-lg-surface-2"
            >
              <div>
                <p className="text-sm font-medium text-lg-text-secondary capitalize">
                  {config.provider}
                </p>
                <p className="text-xs text-lg-text-muted">
                  {config.notify_on.replace(/_/g, " ")} &middot;{" "}
                  {config.throttle_minutes}m throttle
                </p>
              </div>
              <div className="flex items-center gap-2">
                {testResult[config.id] && (
                  <span
                    className={`text-xs ${
                      testResult[config.id] === "sent"
                        ? "text-lg-pass"
                        : "text-lg-fail"
                    }`}
                  >
                    {testResult[config.id] === "sent" ? "Sent!" : "Failed"}
                  </span>
                )}
                <button
                  onClick={() => handleTest(config.id)}
                  disabled={testingId === config.id}
                  className="p-1.5 text-lg-text-muted hover:text-lg-accent transition-colors disabled:opacity-50"
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
          ))}
        </div>
      )}
    </div>
  );
}
