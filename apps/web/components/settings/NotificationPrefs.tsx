"use client";

import { useState } from "react";

interface Pref {
  id: string;
  label: string;
  description: string;
  email: boolean;
  webhook: boolean;
}

const initialPrefs: Pref[] = [
  {
    id: "check-failed",
    label: "Check Failed",
    description: "When a commit check pipeline fails",
    email: true,
    webhook: true,
  },
  {
    id: "secret-detected",
    label: "Secret Detected",
    description: "When a secret or credential is found in a commit",
    email: true,
    webhook: true,
  },
  {
    id: "check-warning",
    label: "Check Warning",
    description: "When checks pass with warnings",
    email: false,
    webhook: true,
  },
  {
    id: "agent-pattern",
    label: "Agent Pattern Alert",
    description: "When an AI agent repeats known bad patterns",
    email: true,
    webhook: false,
  },
  {
    id: "weekly-summary",
    label: "Weekly Summary",
    description: "Weekly digest of all check activity",
    email: true,
    webhook: false,
  },
];

export default function NotificationPrefs() {
  const [prefs, setPrefs] = useState(initialPrefs);

  const togglePref = (id: string, channel: "email" | "webhook") => {
    setPrefs((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, [channel]: !p[channel] } : p
      )
    );
  };

  return (
    <div>
      <div className="grid grid-cols-[1fr,80px,80px] gap-2 mb-2 px-1">
        <span />
        <span className="text-xs font-medium text-gray-500 text-center uppercase tracking-wider">
          Email
        </span>
        <span className="text-xs font-medium text-gray-500 text-center uppercase tracking-wider">
          Webhook
        </span>
      </div>
      <div className="space-y-1">
        {prefs.map((pref) => (
          <div
            key={pref.id}
            className="grid grid-cols-[1fr,80px,80px] gap-2 items-center rounded-lg px-3 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{pref.label}</p>
              <p className="text-xs text-gray-500">{pref.description}</p>
            </div>
            <div className="flex justify-center">
              <input
                type="checkbox"
                checked={pref.email}
                onChange={() => togglePref(pref.id, "email")}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
              />
            </div>
            <div className="flex justify-center">
              <input
                type="checkbox"
                checked={pref.webhook}
                onChange={() => togglePref(pref.id, "webhook")}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
