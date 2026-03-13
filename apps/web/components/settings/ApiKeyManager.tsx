"use client";

import { useState } from "react";
import { Key, Trash2, Plus, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created: string;
  lastUsed: string | null;
}

const initialKeys: ApiKey[] = [
  {
    id: "1",
    name: "CLI - Development",
    prefix: "lg_dev_a3f8",
    created: "Jan 10, 2024",
    lastUsed: "2 hours ago",
  },
  {
    id: "2",
    name: "CI Pipeline",
    prefix: "lg_ci_d9e1",
    created: "Jan 5, 2024",
    lastUsed: "5 min ago",
  },
];

export default function ApiKeyManager() {
  const [keys, setKeys] = useState(initialKeys);
  const [newKeyName, setNewKeyName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateKey = () => {
    if (!newKeyName.trim()) return;
    const fakeKey = `lg_${newKeyName.toLowerCase().replace(/\s+/g, "_")}_${Math.random().toString(36).slice(2, 10)}`;
    const newKey: ApiKey = {
      id: String(keys.length + 1),
      name: newKeyName,
      prefix: fakeKey.slice(0, 12),
      created: "Just now",
      lastUsed: null,
    };
    setKeys((prev) => [...prev, newKey]);
    setGeneratedKey(fakeKey);
    setNewKeyName("");
  };

  const revokeKey = (id: string) => {
    setKeys((prev) => prev.filter((k) => k.id !== id));
  };

  const copyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Existing keys */}
      <div className="space-y-2">
        {keys.map((key) => (
          <div
            key={key.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Key className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{key.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <code className="text-xs font-mono text-gray-500">
                    {key.prefix}...
                  </code>
                  <span className="text-xs text-gray-400">
                    Created {key.created}
                  </span>
                  {key.lastUsed && (
                    <span className="text-xs text-gray-400">
                      Last used {key.lastUsed}
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

      {/* Generated key display */}
      {generatedKey && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800 mb-2">
            New API key generated — copy it now, it won&apos;t be shown again.
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

      {/* Generate new key */}
      {showNew ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Key name (e.g., CLI - Production)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="flex-1 h-9 rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            onKeyDown={(e) => e.key === "Enter" && generateKey()}
          />
          <Button size="sm" onClick={generateKey}>
            Generate
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowNew(false);
              setNewKeyName("");
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNew(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Generate New Key
        </Button>
      )}
    </div>
  );
}
