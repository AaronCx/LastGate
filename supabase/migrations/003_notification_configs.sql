-- Notification configuration for Slack and Discord webhooks

CREATE TABLE notification_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES repos(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'slack' | 'discord'
  webhook_url TEXT NOT NULL, -- encrypted at rest
  notify_on TEXT DEFAULT 'fail_only', -- 'fail_only' | 'fail_and_warn' | 'all'
  throttle_minutes INT DEFAULT 5,
  quiet_hours_start TIME, -- e.g., '22:00'
  quiet_hours_end TIME, -- e.g., '08:00'
  quiet_hours_timezone TEXT DEFAULT 'UTC',
  mention_on_critical TEXT, -- Slack: '<@U123>', Discord: '<@&role_id>'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_configs_repo ON notification_configs(repo_id);

-- RLS
ALTER TABLE notification_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY notification_configs_own ON notification_configs FOR ALL
  USING (repo_id IN (SELECT id FROM repos WHERE user_id = auth.uid()));
