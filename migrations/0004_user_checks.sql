CREATE TABLE IF NOT EXISTS user_checks (
  user_id TEXT NOT NULL,
  event_slug TEXT NOT NULL,
  checks TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, event_slug)
);
