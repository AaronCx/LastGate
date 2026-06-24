"use client";

import { useEffect, useState } from "react";
import {
  RULE_META,
  defaultRuleDefaults,
  type RuleDefaults,
  type RuleKey,
} from "@/lib/settings-defaults";

export default function GlobalRuleDefaults() {
  const [defaults, setDefaults] = useState<RuleDefaults>(defaultRuleDefaults());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.defaults) setDefaults(j.defaults);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  async function toggle(key: RuleKey) {
    const prev = defaults[key].enabled;
    const next = { ...defaults, [key]: { enabled: !prev } };
    setDefaults(next); // optimistic
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaults: next }),
      });
      if (!res.ok) throw new Error("save failed");
    } catch {
      // revert only the toggled key, leaving any other in-flight changes intact
      setDefaults((d) => ({ ...d, [key]: { enabled: prev } }));
    }
  }

  return (
    <div className="space-y-4">
      {RULE_META.map((rule) => (
        <div key={rule.key} className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-lg-text">{rule.name}</p>
            <p className="text-xs text-lg-text-muted">{rule.desc}</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={defaults[rule.key].enabled}
              onChange={() => toggle(rule.key)}
              disabled={!loaded}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-lg-surface-2 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-lg-border after:bg-lg-surface after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-primary/20" />
          </label>
        </div>
      ))}
    </div>
  );
}
