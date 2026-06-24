-- Stored unified diff for a check run, so the review page can render <DiffViewer>
-- per file. Built by concatenating each changed file's patch at the producer
-- boundary (CLI + webhook). Nullable; large; excluded from list queries.
ALTER TABLE check_runs ADD COLUMN IF NOT EXISTS diff TEXT;
