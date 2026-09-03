CREATE TABLE IF NOT EXISTS user_wishlist (
  user_id TEXT NOT NULL,
  event_slug TEXT NOT NULL,
  starred INTEGER NOT NULL DEFAULT 0,
  circles TEXT NOT NULL DEFAULT '{}',
  starred_at TEXT,
  circles_updated_at TEXT,
  PRIMARY KEY (user_id, event_slug)
);
