-- LastGate Database Schema
-- Run this migration in your Supabase project

-- Users (synced from GitHub OAuth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id BIGINT UNIQUE NOT NULL,
  github_username TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  access_token TEXT, -- encrypted GitHub token
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Connected repositories
CREATE TABLE repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  github_repo_id BIGINT UNIQUE NOT NULL,
  full_name TEXT NOT NULL, -- e.g. "AaronCx/AgentForge"
  default_branch TEXT DEFAULT 'main',
  installation_id BIGINT NOT NULL, -- GitHub App installation
  config JSONB DEFAULT '{}', -- parsed .lastgate.yml
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual check runs
CREATE TABLE check_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES repos(id) ON DELETE CASCADE,
  commit_sha TEXT NOT NULL,
  pr_number INT, -- NULL for direct pushes
  branch TEXT NOT NULL,
  trigger_event TEXT NOT NULL, -- 'push' | 'pull_request'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'running' | 'passed' | 'failed' | 'warned'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  -- Aggregate results
  total_checks INT DEFAULT 0,
  passed_checks INT DEFAULT 0,
  failed_checks INT DEFAULT 0,
  warned_checks INT DEFAULT 0,
  -- Metadata
  commit_message TEXT,
  commit_author TEXT,
  is_agent_commit BOOLEAN DEFAULT FALSE, -- heuristic detection
  agent_session_id TEXT, -- group related agent commits
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual check results within a run
CREATE TABLE check_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_run_id UUID REFERENCES check_runs(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL, -- 'secrets' | 'duplicates' | 'lint' | 'build' | etc.
  status TEXT NOT NULL, -- 'pass' | 'warn' | 'fail'
  title TEXT NOT NULL,
  summary TEXT,
  details JSONB DEFAULT '{}', -- structured findings (file, line, message, etc.)
  duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User actions / overrides
CREATE TABLE review_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_run_id UUID REFERENCES check_runs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL, -- 'approve' | 'reject' | 'send_to_agent' | 'override'
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API keys for CLI access
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL, -- hashed, never stored plain
  key_prefix TEXT NOT NULL, -- first 8 chars for identification (e.g. "lg_abc12...")
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_check_runs_repo ON check_runs(repo_id, created_at DESC);
CREATE INDEX idx_check_runs_sha ON check_runs(commit_sha);
CREATE INDEX idx_check_results_run ON check_results(check_run_id);
CREATE INDEX idx_repos_user ON repos(user_id);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only see their own data
CREATE POLICY users_own ON users FOR ALL USING (id = auth.uid());
CREATE POLICY repos_own ON repos FOR ALL USING (user_id = auth.uid());
CREATE POLICY check_runs_own ON check_runs FOR ALL
  USING (repo_id IN (SELECT id FROM repos WHERE user_id = auth.uid()));
CREATE POLICY check_results_own ON check_results FOR ALL
  USING (check_run_id IN (
    SELECT cr.id FROM check_runs cr
    JOIN repos r ON cr.repo_id = r.id
    WHERE r.user_id = auth.uid()
  ));
CREATE POLICY review_actions_own ON review_actions FOR ALL
  USING (user_id = auth.uid());
CREATE POLICY api_keys_own ON api_keys FOR ALL
  USING (user_id = auth.uid());
