-- Opaque, hashed, expiring sessions.
--
-- Previously the `lastgate_session` cookie value WAS the user's primary-key UUID,
-- and requireSession just checked the row existed — so any leaked/enumerable user
-- id was a permanent, forgeable bearer credential (account takeover). Sessions are
-- now keyed by an opaque high-entropy random token; only its SHA-256 hash is stored,
-- with a server-side expiry and revocation so logout-everywhere actually works.

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- SHA-256 hex of the opaque cookie token. The raw token is never stored, so a
  -- DB read cannot mint a working cookie.
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- Service-role only (the web server reaches sessions with the service key); no
-- anon/self access. RLS on with no permissive policy denies everything else.
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
