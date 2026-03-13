export interface NotificationConfig {
  id: string;
  repo_id: string;
  provider: "slack" | "discord";
  webhook_url: string;
  notify_on: "fail_only" | "fail_and_warn" | "all";
  throttle_minutes: number;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  quiet_hours_timezone: string;
  mention_on_critical: string | null;
  is_active: boolean;
}

export interface NotificationPayload {
  repoFullName: string;
  commitSha: string;
  branch: string;
  status: "passed" | "failed" | "warned";
  failures: { checkType: string; summary: string }[];
  warnings: { checkType: string; summary: string }[];
  dashboardUrl: string;
  githubUrl: string;
}
