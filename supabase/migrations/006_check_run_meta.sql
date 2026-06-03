-- Provenance metadata for a check run: which engine + resolved config produced
-- it. Lets the dashboard (and a drift guard) see what judged a PR, so a stale
-- deployment can't be misdiagnosed.

ALTER TABLE check_runs ADD COLUMN IF NOT EXISTS engine_version TEXT;
ALTER TABLE check_runs ADD COLUMN IF NOT EXISTS meta JSONB;
