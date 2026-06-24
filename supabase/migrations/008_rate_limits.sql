-- Atomic fixed-window rate limiter, backed by Postgres so it works across
-- serverless invocations (an in-memory per-process counter does nothing on
-- Vercel — the flaw the engine's notification throttle had).

CREATE TABLE rate_limits (
  bucket TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  count INT NOT NULL DEFAULT 0
);
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Records a hit and returns TRUE if still within the limit. The whole
-- read-modify-write is one atomic upsert, so concurrent requests can't race
-- past the limit (the TOCTOU the old throttle had).
CREATE OR REPLACE FUNCTION rate_limit_hit(p_bucket TEXT, p_limit INT, p_window_sec INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO rate_limits (bucket, window_start, count)
  VALUES (p_bucket, NOW(), 1)
  ON CONFLICT (bucket) DO UPDATE
    SET count = CASE
          WHEN rate_limits.window_start < NOW() - (p_window_sec || ' seconds')::interval
          THEN 1 ELSE rate_limits.count + 1 END,
        window_start = CASE
          WHEN rate_limits.window_start < NOW() - (p_window_sec || ' seconds')::interval
          THEN NOW() ELSE rate_limits.window_start END
  RETURNING count INTO v_count;
  RETURN v_count <= p_limit;
END;
$$;
