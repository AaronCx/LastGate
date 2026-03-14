"use client";

import { useState, useEffect, useCallback } from "react";
import { Key, Trash2, Plus, Copy, Check, Terminal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/cli/auth");
      if (!res.ok) throw new Error("Failed to fetch API keys");
      const data = await res.json();
      // The GET endpoint returns device flow data, so keys come from a separate query
      // For now, keys are listed via the api_keys table
      setKeys(Array.isArray(data.data) ? data.data : []);
    } catch {
      // Keys may not be fetchable if no list endpoint exists yet
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/cli/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to generate key");
      }

      const { api_key } = await res.json();
      setGeneratedKey(api_key);
      setShowGenerate(false);
      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Key generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const copyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const revokeKey = async (id: string) => {
    const res = await fetch(`/api/cli/auth?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setKeys((prev) => prev.filter((k) => k.id !== id));
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatRelative = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-4">
      {/* CLI instructions */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-start gap-3">
          <Terminal className="h-5 w-5 text-gray-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              Authenticate via CLI
            </p>
            <p className="text-xs text-gray-500 mt-1">
              The recommended way to generate API keys is through the CLI device
              flow. Run the following command:
            </p>
            <code className="block mt-2 text-xs font-mono bg-gray-900 text-gray-200 rounded px-3 py-2">
              lastgate login
            </code>
          </div>
        </div>
      </div>

      {/* Existing keys */}
      {loading ? (
        <div className="flex items-center justify-center py-4 text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm">Loading keys...</span>
        </div>
      ) : keys.length > 0 ? (
        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Key className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {key.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className="text-xs font-mono text-gray-500">
                      {key.key_prefix}...
                    </code>
                    <span className="text-xs text-gray-400">
                      Created {formatDate(key.created_at)}
                    </span>
                    {key.last_used_at && (
                      <span className="text-xs text-gray-400">
                        Last used {formatRelative(key.last_used_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => revokeKey(key.id)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-2">
          No API keys yet. Use the CLI or generate one below.
        </p>
      )}

      {/* Generated key display */}
      {generatedKey && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800 mb-2">
            API key generated — copy it now, it won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono bg-white border border-emerald-200 rounded px-3 py-1.5 text-gray-900">
              {generatedKey}
            </code>
            <Button size="sm" variant="outline" onClick={copyKey}>
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="text-sm text-red-600 text-center">{error}</div>
      )}

      {/* Generate key button */}
      {showGenerate ? (
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-600 flex-1">
            This will start a device authorization flow to generate a key.
          </p>
          <Button size="sm" onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Generating...
              </>
            ) : (
              "Confirm"
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowGenerate(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowGenerate(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Generate New Key
        </Button>
      )}
    </div>
  );
}
