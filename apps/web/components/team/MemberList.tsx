"use client";

import { cn } from "@/lib/utils";

interface Member {
  id: string;
  role: string;
  users: {
    github_username: string;
    avatar_url: string | null;
  };
}

interface MemberListProps {
  members: Member[];
  onRoleChange?: (memberId: string, newRole: string) => void;
  canManage?: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-500/10 text-purple-400",
  admin: "bg-lg-accent/10 text-lg-accent",
  maintainer: "bg-emerald-500/10 text-lg-pass",
  developer: "bg-lg-surface-2 text-lg-text-secondary",
  viewer: "bg-lg-surface-2 text-lg-text-muted",
};

export default function MemberList({ members, onRoleChange, canManage }: MemberListProps) {
  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between p-3 rounded-lg bg-lg-surface-2"
        >
          <div className="flex items-center gap-3">
            {member.users.avatar_url ? (
              <img
                src={member.users.avatar_url}
                alt=""
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-lg-surface-2" />
            )}
            <span className="text-sm font-medium text-lg-text-secondary">
              {member.users.github_username}
            </span>
          </div>
          <span
            className={cn(
              "px-2 py-0.5 rounded text-xs font-medium capitalize",
              ROLE_COLORS[member.role] || ROLE_COLORS.viewer
            )}
          >
            {member.role}
          </span>
        </div>
      ))}
    </div>
  );
}
