CREATE TABLE IF NOT EXISTS simkl_proxy_rate_limits (
  key_hash TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS simkl_proxy_rate_limits_window_idx
  ON simkl_proxy_rate_limits (window_started_at);
