-- Reproduces the production D1 schema for gbc-seoko-db.
-- Derived from worker/app.ts queries (events, circles, participations, links,
-- tweet_infos, ips, circle_ips, verification_log).

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  alias       TEXT,
  fare_id     INTEGER,
  date_label  TEXT,
  start_date  TEXT,
  end_date    TEXT,
  venue       TEXT,
  map_url     TEXT,
  status      TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS circles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (event_id, slug),
  UNIQUE (id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_circles_event ON circles(event_id);

CREATE TABLE IF NOT EXISTS participations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  circle_id   INTEGER NOT NULL,
  event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  genre_label TEXT,
  genre_tags  TEXT,                      -- JSON array of strings
  booth       TEXT,
  day         TEXT,
  booth_url   TEXT,
  highlight   INTEGER NOT NULL DEFAULT 0,
  badge       TEXT,
  note        TEXT,
  status      TEXT NOT NULL DEFAULT 'confirmed',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (circle_id, event_id),
  FOREIGN KEY (circle_id, event_id) REFERENCES circles(id, event_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_participations_event ON participations(event_id);
CREATE INDEX IF NOT EXISTS idx_participations_circle ON participations(circle_id);

CREATE TABLE IF NOT EXISTS links (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  participation_id INTEGER NOT NULL REFERENCES participations(id) ON DELETE CASCADE,
  kind             TEXT NOT NULL DEFAULT 'other',
  label            TEXT NOT NULL,
  url              TEXT NOT NULL,
  sort_order       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_links_participation ON links(participation_id);

CREATE TABLE IF NOT EXISTS tweet_infos (
  participation_id INTEGER PRIMARY KEY REFERENCES participations(id) ON DELETE CASCADE,
  url              TEXT NOT NULL,
  og_title         TEXT,
  og_description   TEXT,
  og_image         TEXT,
  og_site_name     TEXT,
  captured_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ips (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS circle_ips (
  circle_id INTEGER NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  ip_id     INTEGER NOT NULL REFERENCES ips(id) ON DELETE CASCADE,
  PRIMARY KEY (circle_id, ip_id)
);
CREATE INDEX IF NOT EXISTS idx_circle_ips_ip ON circle_ips(ip_id);

CREATE TABLE IF NOT EXISTS verification_log (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  circle_id        INTEGER NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  participation_id INTEGER,
  event_id         INTEGER,
  source           TEXT NOT NULL,
  result           TEXT NOT NULL,
  detail           TEXT,
  checked_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_verification_circle ON verification_log(circle_id);
CREATE INDEX IF NOT EXISTS idx_verification_checked ON verification_log(checked_at);
