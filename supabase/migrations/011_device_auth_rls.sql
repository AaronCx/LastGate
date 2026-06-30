-- 005 created device_auth WITHOUT enabling RLS, so it was reachable through the
-- public (anon) API — Supabase flagged it as "rls_disabled_in_public", and it was
-- exploitable (an attacker could insert a pre-'authorized' row and exchange it for
-- an API key). Enable RLS with NO policy (deny-all), matching sessions/rate_limits/
-- user_settings. The app reaches device_auth only with the service-role key, which
-- bypasses RLS, so the device-auth login flow is unaffected. Idempotent.
ALTER TABLE device_auth ENABLE ROW LEVEL SECURITY;
