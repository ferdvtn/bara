-- Bara App — Initial Migration
-- Jalankan manual via Turso Dashboard atau CLI:
-- turso db shell bara < migrations/001_init.sql

CREATE TABLE IF NOT EXISTS activity_logs (
  id            TEXT     NOT NULL PRIMARY KEY,
  activity_type TEXT     NOT NULL,
  duration      INTEGER  NOT NULL,
  intensity     INTEGER  NOT NULL,
  logged_date   TEXT     NOT NULL,
  created_at    TEXT     NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(logged_date);

CREATE TABLE IF NOT EXISTS user_state (
  id               INTEGER  NOT NULL PRIMARY KEY DEFAULT 1,
  current_streak   INTEGER  NOT NULL DEFAULT 0,
  longest_streak   INTEGER  NOT NULL DEFAULT 0,
  freeze_credits   INTEGER  NOT NULL DEFAULT 1,
  last_active_date TEXT     DEFAULT NULL,
  push_endpoint    TEXT     DEFAULT NULL,
  push_p256dh      TEXT     DEFAULT NULL,
  push_auth        TEXT     DEFAULT NULL,
  push_enabled     INTEGER  NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO user_state (id) VALUES (1);

-- Sessions table for persistent auth tokens (replaces in-memory Map)
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT NOT NULL PRIMARY KEY,
  created_at TEXT NOT NULL
);
