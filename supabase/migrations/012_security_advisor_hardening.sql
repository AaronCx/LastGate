-- Supabase security advisor follow-ups (companion to 011_device_auth_rls):
--
-- 1) The analytics views (002) were SECURITY DEFINER, so querying them ran with
--    the owner's rights and BYPASSED RLS on the underlying tables — the anon API
--    could read aggregates across every tenant. security_invoker makes them run
--    as the caller, so RLS applies (the app uses the service-role key, which
--    bypasses RLS regardless, so dashboards are unaffected).
ALTER VIEW public.daily_pass_rate  SET (security_invoker = on);
ALTER VIEW public.top_failures     SET (security_invoker = on);
ALTER VIEW public.agent_reliability SET (security_invoker = on);

-- 2) Pin the rate-limit function's search_path so it can't be hijacked by a
--    caller-controlled search_path (advisor: function_search_path_mutable).
ALTER FUNCTION public.rate_limit_hit(text, integer, integer) SET search_path = public, pg_temp;
