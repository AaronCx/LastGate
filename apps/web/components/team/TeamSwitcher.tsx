"use client";

import { useState } from "react";
import { ChevronDown, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
  slug: string;
}

interface TeamSwitcherProps {
  teams: Team[];
  currentTeamId: string | null;
  onSwitch: (teamId: string | null) => void;
}

export default function TeamSwitcher({ teams, currentTeamId, onSwitch }: TeamSwitcherProps) {
  const [open, setOpen] = useState(false);
  const current = teams.find((t) => t.id === currentTeamId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-lg-surface-2 text-lg-text hover:bg-lg-surface-2/80 w-full"
      >
        {current ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
        <span className="flex-1 text-left truncate">
          {current?.name || "Personal"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-lg-text-muted" />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-lg-surface-2 rounded-lg border border-lg-border shadow-lg z-50">
          <button
            onClick={() => { onSwitch(null); setOpen(false); }}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-lg-surface rounded-t-lg",
              !currentTeamId ? "text-lg-text bg-lg-surface" : "text-lg-text-secondary"
            )}
          >
            <User className="h-3.5 w-3.5" />
            Personal
          </button>
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => { onSwitch(team.id); setOpen(false); }}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-lg-surface last:rounded-b-lg",
                currentTeamId === team.id ? "text-lg-text bg-lg-surface" : "text-lg-text-secondary"
              )}
            >
              <Users className="h-3.5 w-3.5" />
              {team.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
