"use client";

import { formatDistanceToNow } from "date-fns";

interface AuditEntry {
  id: string;
  action: string;
  resource_type: string;
  details: Record<string, unknown>;
  created_at: string;
  users?: { github_username: string };
}

interface AuditLogTableProps {
  entries: AuditEntry[];
}

const ACTION_LABELS: Record<string, string> = {
  check_override: "Override check",
  config_change: "Changed config",
  member_added: "Added member",
  member_removed: "Removed member",
  member_role_changed: "Changed role",
  repo_added: "Added repo",
  repo_removed: "Removed repo",
  notification_config_changed: "Changed notifications",
  team_created: "Created team",
  team_updated: "Updated team",
};

export default function AuditLogTable({ entries }: AuditLogTableProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-lg-text-muted text-center py-8">
        No audit events recorded
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between p-3 rounded-lg bg-lg-surface-2"
        >
          <div>
            <p className="text-sm font-medium text-lg-text-secondary">
              {ACTION_LABELS[entry.action] || entry.action}
            </p>
            <p className="text-xs text-lg-text-muted">
              {entry.users?.github_username || "System"} &middot;{" "}
              {entry.resource_type}
            </p>
          </div>
          <span className="text-xs text-lg-text-muted">
            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
          </span>
        </div>
      ))}
    </div>
  );
}
