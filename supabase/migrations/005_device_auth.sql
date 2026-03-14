-- Device authentication for CLI device flow
CREATE TABLE IF NOT EXISTS device_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code TEXT UNIQUE NOT NULL,
  user_code TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'authorized' | 'consumed'
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_device_auth_code ON device_auth(device_code);
CREATE INDEX idx_device_auth_user_code ON device_auth(user_code);

-- Auto-cleanup expired device auth entries
CREATE INDEX idx_device_auth_expires ON device_auth(expires_at);
