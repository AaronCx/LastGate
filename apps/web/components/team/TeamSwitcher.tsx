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
        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-gray-800 text-gray-200 hover:bg-gray-700 w-full"
      >
        {current ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
        <span className="flex-1 text-left truncate">
          {current?.name || "Personal"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 rounded-lg border border-gray-700 shadow-lg z-50">
          <button
            onClick={() => { onSwitch(null); setOpen(false); }}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-700 rounded-t-lg",
              !currentTeamId ? "text-white bg-gray-700" : "text-gray-300"
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
                "flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-700 last:rounded-b-lg",
                currentTeamId === team.id ? "text-white bg-gray-700" : "text-gray-300"
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
