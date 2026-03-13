-- Analytics views for dashboard charts and metrics

-- Daily check pass rate per repo
CREATE OR REPLACE VIEW daily_pass_rate AS
SELECT
  repo_id,
  DATE(created_at) AS day,
  COUNT(*) AS total_runs,
  COUNT(*) FILTER (WHERE status = 'passed') AS passed,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed,
  COUNT(*) FILTER (WHERE status = 'warned') AS warned,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'passed')::numeric / NULLIF(COUNT(*), 0)::numeric * 100, 1
  ) AS pass_rate
FROM check_runs
GROUP BY repo_id, DATE(created_at);

-- Most common failure types across all repos
CREATE OR REPLACE VIEW top_failures AS
SELECT
  check_type,
  COUNT(*) AS failure_count,
  COUNT(DISTINCT cr.repo_id) AS repos_affected
FROM check_results res
JOIN check_runs cr ON res.check_run_id = cr.id
WHERE res.status = 'fail'
GROUP BY check_type
ORDER BY failure_count DESC;

-- Agent reliability metrics
CREATE OR REPLACE VIEW agent_reliability AS
SELECT
  commit_author,
  is_agent_commit,
  COUNT(*) AS total_commits,
  COUNT(*) FILTER (WHERE status = 'passed') AS passed_commits,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_commits,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'passed')::numeric / NULLIF(COUNT(*), 0)::numeric * 100, 1
  ) AS pass_rate
FROM check_runs
GROUP BY commit_author, is_agent_commit;

-- Indexes for analytics query performance
CREATE INDEX IF NOT EXISTS idx_check_runs_status ON check_runs(status);
CREATE INDEX IF NOT EXISTS idx_check_runs_created ON check_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_check_runs_agent ON check_runs(is_agent_commit);
CREATE INDEX IF NOT EXISTS idx_check_results_status ON check_results(status);
CREATE INDEX IF NOT EXISTS idx_check_results_type ON check_results(check_type);
