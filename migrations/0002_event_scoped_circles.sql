-- Rebuild the circle FK graph so the legacy UNIQUE(slug) constraint is removed.
-- D1 wraps migrations in a transaction, so this works with foreign keys enabled.
PRAGMA defer_foreign_keys = ON;

-- Legacy circles without a participation were unreachable. Preserve them in a
-- dedicated past event instead of dropping them or leaving NULL-scoped slugs.
CREATE TABLE orphan_event_0002 (id INTEGER PRIMARY KEY);
INSERT INTO orphan_event_0002 (id)
SELECT COALESCE(MIN(id), 0) - 1 FROM events
WHERE EXISTS (
  SELECT 1 FROM circles c
  WHERE NOT EXISTS (SELECT 1 FROM participations p WHERE p.circle_id = c.id)
);
INSERT INTO events (id, slug, title, status)
SELECT id, 'migration-orphans-0002-' || ABS(id), '마이그레이션 보존 서클', 'past'
FROM orphan_event_0002;

CREATE TABLE circles_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(event_id, slug),
  UNIQUE(id, event_id)
);

INSERT INTO circles_new (id, event_id, slug, name, created_at, updated_at)
SELECT c.id, COALESCE(MIN(p.event_id), (SELECT id FROM orphan_event_0002)), c.slug, c.name, c.created_at, c.updated_at
FROM circles c LEFT JOIN participations p ON p.circle_id = c.id GROUP BY c.id;

INSERT INTO circles_new (event_id, slug, name, created_at, updated_at)
SELECT p.event_id, c.slug, c.name, c.created_at, c.updated_at
FROM participations p JOIN circles c ON c.id = p.circle_id
WHERE p.event_id <> (SELECT event_id FROM circles_new WHERE id = c.id);

CREATE TABLE participations_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  circle_id INTEGER NOT NULL,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  genre_label TEXT, genre_tags TEXT, booth TEXT, day TEXT, booth_url TEXT,
  highlight INTEGER NOT NULL DEFAULT 0, badge TEXT, note TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(circle_id, event_id),
  FOREIGN KEY(circle_id, event_id) REFERENCES circles_new(id, event_id) ON DELETE CASCADE
);
INSERT INTO participations_new
SELECT p.id, n.id, p.event_id, p.genre_label, p.genre_tags, p.booth, p.day, p.booth_url,
       p.highlight, p.badge, p.note, p.status, p.created_at, p.updated_at
FROM participations p JOIN circles c ON c.id=p.circle_id
JOIN circles_new n ON n.slug=c.slug AND n.event_id=p.event_id;

CREATE TABLE links_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participation_id INTEGER NOT NULL REFERENCES participations_new(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'other', label TEXT NOT NULL, url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
INSERT INTO links_new SELECT * FROM links;

CREATE TABLE tweet_infos_new (
  participation_id INTEGER PRIMARY KEY REFERENCES participations_new(id) ON DELETE CASCADE,
  url TEXT NOT NULL, og_title TEXT, og_description TEXT, og_image TEXT, og_site_name TEXT,
  captured_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO tweet_infos_new
  (participation_id, url, og_title, og_description, og_image, og_site_name)
SELECT participation_id, url, og_title, og_description, og_image, og_site_name
FROM tweet_infos;

CREATE TABLE circle_ips_new (
  circle_id INTEGER NOT NULL REFERENCES circles_new(id) ON DELETE CASCADE,
  ip_id INTEGER NOT NULL REFERENCES ips(id) ON DELETE CASCADE,
  PRIMARY KEY(circle_id, ip_id)
);
INSERT OR IGNORE INTO circle_ips_new
SELECT n.id, ci.ip_id FROM circle_ips ci
JOIN circles c ON c.id=ci.circle_id JOIN circles_new n ON n.slug=c.slug;

CREATE TABLE verification_log_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  circle_id INTEGER NOT NULL REFERENCES circles_new(id) ON DELETE CASCADE,
  participation_id INTEGER,
  event_id INTEGER,
  source TEXT NOT NULL, result TEXT NOT NULL, detail TEXT,
  checked_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO verification_log_new
SELECT v.id, COALESCE(scoped.id, base.id), v.participation_id, v.event_id,
       v.source, v.result, v.detail, v.checked_at
FROM verification_log v JOIN circles c ON c.id=v.circle_id
JOIN circles_new base ON base.id=c.id
LEFT JOIN circles_new scoped ON scoped.slug=c.slug AND scoped.event_id=v.event_id;

DROP TABLE verification_log;
DROP TABLE tweet_infos;
DROP TABLE links;
DROP TABLE circle_ips;
DROP TABLE participations;
DROP TABLE circles;

ALTER TABLE circles_new RENAME TO circles;
ALTER TABLE participations_new RENAME TO participations;
ALTER TABLE links_new RENAME TO links;
ALTER TABLE tweet_infos_new RENAME TO tweet_infos;
ALTER TABLE circle_ips_new RENAME TO circle_ips;
ALTER TABLE verification_log_new RENAME TO verification_log;

CREATE INDEX idx_circles_event ON circles(event_id);
CREATE INDEX idx_participations_event ON participations(event_id);
CREATE INDEX idx_participations_circle ON participations(circle_id);
CREATE INDEX idx_links_participation ON links(participation_id);
CREATE INDEX idx_circle_ips_ip ON circle_ips(ip_id);
CREATE INDEX idx_verification_circle ON verification_log(circle_id);
CREATE INDEX idx_verification_checked ON verification_log(checked_at);

DROP TABLE orphan_event_0002;
