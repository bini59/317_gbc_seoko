import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  fileURLToPath(new URL("../../migrations/0002_event_scoped_circles.sql", import.meta.url)),
  "utf8",
);
const initMigration = readFileSync(
  fileURLToPath(new URL("../../migrations/0001_init.sql", import.meta.url)),
  "utf8",
);

describe("event-scoped circles migration", () => {
  it("does not create a preservation event when there are no orphan circles", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    db.exec(initMigration);
    db.exec("BEGIN");
    db.exec(migration);
    db.exec("COMMIT");

    expect(db.prepare("SELECT COUNT(*) AS count FROM events WHERE slug LIKE 'migration-orphans-0002-%'").get()).toMatchObject({ count: 0 });
  });

  it("preserves legacy participation data while splitting a circle shared by events", () => {
    const db = new DatabaseSync(":memory:");
    db.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE events (
        id INTEGER PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active'
      );
      CREATE TABLE circles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE participations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        circle_id INTEGER NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
        event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        genre_label TEXT, genre_tags TEXT, booth TEXT, day TEXT, booth_url TEXT,
        highlight INTEGER NOT NULL DEFAULT 0, badge TEXT, note TEXT,
        status TEXT NOT NULL DEFAULT 'confirmed',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(circle_id, event_id)
      );
      CREATE TABLE ips (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
      CREATE TABLE circle_ips (
        circle_id INTEGER NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
        ip_id INTEGER NOT NULL REFERENCES ips(id) ON DELETE CASCADE,
        PRIMARY KEY(circle_id, ip_id)
      );
      CREATE TABLE links (
        id INTEGER PRIMARY KEY,
        participation_id INTEGER NOT NULL REFERENCES participations(id) ON DELETE CASCADE,
        kind TEXT NOT NULL DEFAULT 'other', label TEXT NOT NULL, url TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE tweet_infos (
        participation_id INTEGER PRIMARY KEY REFERENCES participations(id) ON DELETE CASCADE,
        url TEXT NOT NULL, og_title TEXT, og_description TEXT, og_image TEXT, og_site_name TEXT
      );
      CREATE TABLE verification_log (
        id INTEGER PRIMARY KEY,
        circle_id INTEGER NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
        participation_id INTEGER,
        event_id INTEGER,
        source TEXT NOT NULL,
        result TEXT NOT NULL, detail TEXT,
        checked_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO events VALUES (1, 'event-a', '행사 A', 'active'), (2, 'event-b', '행사 B', 'upcoming');
      INSERT INTO circles (id, slug, name) VALUES (10, 'same-circle', '기존 서클');
      INSERT INTO circles (id, slug, name) VALUES (11, 'orphan-circle', '고아 서클');
      INSERT INTO participations (id, circle_id, event_id) VALUES (20, 10, 1), (21, 10, 2);
      INSERT INTO ips VALUES (30, '작품');
      INSERT INTO circle_ips VALUES (10, 30);
      INSERT INTO links (id, participation_id, label, url) VALUES (40, 21, 'B', 'https://example.com/b');
      INSERT INTO tweet_infos (participation_id, url) VALUES (21, 'https://x.com/b/status/1');
      INSERT INTO verification_log (id, circle_id, participation_id, event_id, source, result) VALUES (50, 10, 21, 2, 'catalog', 'confirmed');
    `);

    db.exec("BEGIN");
    db.exec(migration);
    db.exec("COMMIT");

    const circles = db.prepare("SELECT id, event_id, slug FROM circles ORDER BY event_id").all() as any[];
    expect(circles).toHaveLength(3);
    expect(circles.filter(({ slug }) => slug === "same-circle").map(({ event_id, slug }) => ({ event_id, slug }))).toEqual([
      { event_id: 1, slug: "same-circle" },
      { event_id: 2, slug: "same-circle" },
    ]);
    const orphan = circles.find(({ slug }) => slug === "orphan-circle");
    expect(orphan.event_id).not.toBeNull();
    expect(db.prepare("SELECT title, status FROM events WHERE id = ?").get(orphan.event_id)).toMatchObject({
      title: "마이그레이션 보존 서클",
      status: "past",
    });
    expect(db.prepare("SELECT COUNT(DISTINCT circle_id) AS count FROM participations").get()).toMatchObject({ count: 2 });
    expect(db.prepare("SELECT COUNT(*) AS count FROM circle_ips").get()).toMatchObject({ count: 2 });
    expect(db.prepare("SELECT url FROM links WHERE participation_id = 21").get()).toMatchObject({ url: "https://example.com/b" });
    expect(db.prepare("SELECT url FROM tweet_infos WHERE participation_id = 21").get()).toMatchObject({ url: "https://x.com/b/status/1" });
    expect(db.prepare("SELECT captured_at FROM tweet_infos WHERE participation_id = 21").get()).toMatchObject({ captured_at: expect.any(String) });
    const eventBCircle = circles.find(({ event_id, slug }) => event_id === 2 && slug === "same-circle");
    expect(db.prepare("SELECT circle_id FROM verification_log WHERE id = 50").get()).toMatchObject({ circle_id: eventBCircle.id });
    expect(() => db.exec("INSERT INTO circles (event_id, slug, name) VALUES (1, 'same-circle', '중복')")).toThrow();
    expect(() => db.exec("INSERT INTO circles (event_id, slug, name) VALUES (NULL, 'null-event', '잘못된 서클')")).toThrow();
    expect(() => db.prepare("INSERT INTO participations (circle_id, event_id) VALUES (?, ?)").run(orphan.id, 1)).toThrow();
  });
});
