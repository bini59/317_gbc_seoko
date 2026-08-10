-- Unify all circle classification under ips/circle_ips.
-- Preserve legacy participation.genre_label and participation.genre_tags first,
-- then rebuild participations without those denormalized JSON fields.
PRAGMA defer_foreign_keys = ON;

INSERT OR IGNORE INTO ips (name)
SELECT DISTINCT trim(genre_label)
FROM participations
WHERE genre_label IS NOT NULL AND trim(genre_label) <> '';

INSERT OR IGNORE INTO ips (name)
SELECT DISTINCT trim(j.value)
FROM participations p, json_each(CASE WHEN json_valid(p.genre_tags) THEN p.genre_tags ELSE '[]' END) j
WHERE typeof(j.value) = 'text' AND trim(j.value) <> '';

INSERT OR IGNORE INTO circle_ips (circle_id, ip_id)
SELECT p.circle_id, i.id
FROM participations p
JOIN ips i ON i.name = trim(p.genre_label)
WHERE p.genre_label IS NOT NULL AND trim(p.genre_label) <> '';

INSERT OR IGNORE INTO circle_ips (circle_id, ip_id)
SELECT p.circle_id, i.id
FROM participations p
JOIN json_each(CASE WHEN json_valid(p.genre_tags) THEN p.genre_tags ELSE '[]' END) j
JOIN ips i ON i.name = trim(j.value)
WHERE typeof(j.value) = 'text' AND trim(j.value) <> '';

CREATE TABLE participations_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  circle_id INTEGER NOT NULL,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  booth TEXT,
  day TEXT,
  booth_url TEXT,
  highlight INTEGER NOT NULL DEFAULT 0,
  badge TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (circle_id, event_id),
  FOREIGN KEY (circle_id, event_id) REFERENCES circles(id, event_id) ON DELETE CASCADE
);

INSERT INTO participations_new
  (id, circle_id, event_id, booth, day, booth_url, highlight, badge, note, status, created_at, updated_at)
SELECT id, circle_id, event_id, booth, day, booth_url, highlight, badge, note, status, created_at, updated_at
FROM participations;

DROP TABLE participations;
ALTER TABLE participations_new RENAME TO participations;

CREATE INDEX idx_participations_event ON participations(event_id);
CREATE INDEX idx_participations_circle ON participations(circle_id);
