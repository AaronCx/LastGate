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
  owner: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  maintainer: "bg-emerald-100 text-emerald-700",
  developer: "bg-gray-100 text-gray-700",
  viewer: "bg-gray-50 text-gray-500",
};

export default function MemberList({ members, onRoleChange, canManage }: MemberListProps) {
  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
        >
          <div className="flex items-center gap-3">
            {member.users.avatar_url ? (
              <img
                src={member.users.avatar_url}
                alt=""
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200" />
            )}
            <span className="text-sm font-medium text-gray-700">
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
