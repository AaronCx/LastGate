import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AuditAction =
  | "check_override"
  | "config_change"
  | "member_added"
  | "member_removed"
  | "member_role_changed"
  | "repo_added"
  | "repo_removed"
  | "notification_config_changed"
  | "team_created"
  | "team_updated";

export async function logAuditEvent(
  teamId: string,
  userId: string,
  action: AuditAction,
  resourceType: string,
  resourceId: string | null,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = createServerSupabaseClient();
    await supabase.from("audit_log").insert({
      team_id: teamId,
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
    });
  } catch (err) {
    console.error("Failed to log audit event:", err);
  }
}
