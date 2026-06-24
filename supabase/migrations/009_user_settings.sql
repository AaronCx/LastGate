-- Per-user "Global Rule Defaults" (applied to newly connected repos). One row
-- per user. RLS on with NO policy (deny-all): the web server reaches this table
-- only with the service-role key and scopes every read/write to session.id in
-- app code (same pattern as sessions/api_keys).
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  defaults JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
