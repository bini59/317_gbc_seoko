import { Hono } from "hono";
import { cors } from "hono/cors";

export type Bindings = {
  DB: D1Database;
  ADMIN_TOKEN: string;
};

type CircleRow = {
  circle_id: number;
  slug: string;
  name: string;
  participation_id: number;
  genre_label: string | null;
  genre_tags: string | null;
  booth: string | null;
  day: string | null;
  booth_url: string | null;
  highlight: number;
  badge: string | null;
  note: string | null;
  status: string;
  ips: string | null;
};

type LinkRow = { participation_id: number; kind: string; label: string; url: string; sort_order: number };
type TweetRow = {
  participation_id: number;
  url: string;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  og_site_name: string | null;
};

function serializeCircle(row: CircleRow, links: LinkRow[], tweet?: TweetRow) {
  return {
    id: row.circle_id,
    participationId: row.participation_id,
    slug: row.slug,
    name: row.name,
    genre: row.genre_label,
    genres: row.genre_tags ? JSON.parse(row.genre_tags) : [],
    ips: row.ips ? row.ips.split(",") : [],
    booth: row.booth,
    day: row.day,
    boothUrl: row.booth_url,
    highlight: !!row.highlight,
    badge: row.badge,
    note: row.note,
    status: row.status,
    links: links
      .filter((l) => l.participation_id === row.participation_id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((l) => ({ kind: l.kind, label: l.label, url: l.url })),
    tweetInfo: tweet
      ? {
          url: tweet.url,
          ogTitle: tweet.og_title ?? undefined,
          ogDescription: tweet.og_description ?? undefined,
          ogImage: tweet.og_image ?? undefined,
          ogSiteName: tweet.og_site_name ?? undefined,
        }
      : undefined,
  };
}

export const app = new Hono<{ Bindings: Bindings }>().basePath("/api");

app.use("*", cors());

// require bearer token for mutating routes only
app.use("*", async (c, next) => {
  if (["POST", "PATCH", "PUT", "DELETE"].includes(c.req.method)) {
    const auth = c.req.header("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!c.env.ADMIN_TOKEN || token !== c.env.ADMIN_TOKEN) {
      return c.json({ error: "unauthorized" }, 401);
    }
  }
  await next();
});

// ---- events ----
app.get("/events", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, slug, title, alias, fare_id, date_label, start_date, end_date, venue, map_url, status FROM events ORDER BY start_date DESC"
  ).all();
  return c.json({ events: results });
});

app.post("/events", async (c) => {
  const body = await c.req.json();
  const { slug, title, alias, fare_id, date_label, start_date, end_date, venue, map_url, status } = body;
  if (!slug || !title) return c.json({ error: "slug and title are required" }, 400);
  await c.env.DB.prepare(
    `INSERT INTO events (slug, title, alias, fare_id, date_label, start_date, end_date, venue, map_url, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 'active'))`
  )
    .bind(slug, title, alias ?? null, fare_id ?? null, date_label ?? null, start_date ?? null, end_date ?? null, venue ?? null, map_url ?? null, status ?? null)
    .run();
  return c.json({ ok: true }, 201);
});

// ---- circles (read) ----
app.get("/circles", async (c) => {
  const eventSlug = c.req.query("event");
  const ip = c.req.query("ip");
  const statusFilter = c.req.query("status") ?? "confirmed"; // pass status=all to include unlisted/etc

  let eventId: number | null = null;
  if (eventSlug) {
    const row = await c.env.DB.prepare("SELECT id FROM events WHERE slug = ?").bind(eventSlug).first<{ id: number }>();
    if (!row) return c.json({ error: "event not found" }, 404);
    eventId = row.id;
  } else {
    const row = await c.env.DB.prepare("SELECT id FROM events WHERE status = 'active' ORDER BY start_date DESC LIMIT 1").first<{ id: number }>();
    eventId = row?.id ?? null;
  }
  if (eventId === null) return c.json({ circles: [] });

  const { results: rows } = await c.env.DB.prepare(
    `SELECT c.id as circle_id, c.slug, c.name, p.id as participation_id, p.genre_label, p.genre_tags,
            p.booth, p.day, p.booth_url, p.highlight, p.badge, p.note, p.status,
            (SELECT GROUP_CONCAT(i.name) FROM circle_ips ci JOIN ips i ON i.id = ci.ip_id WHERE ci.circle_id = c.id) as ips
     FROM participations p
     JOIN circles c ON c.id = p.circle_id
     WHERE p.event_id = ? AND (? = 'all' OR p.status = ?)
     ORDER BY c.name`
  )
    .bind(eventId, statusFilter, statusFilter)
    .all<CircleRow>();

  let filteredRows = rows;
  if (ip) {
    filteredRows = rows.filter((r) => (r.ips || "").split(",").includes(ip));
  }

  const participationIds = filteredRows.map((r) => r.participation_id);
  let links: LinkRow[] = [];
  let tweets: TweetRow[] = [];
  if (participationIds.length > 0) {
    const placeholders = participationIds.map(() => "?").join(",");
    const linksRes = await c.env.DB.prepare(`SELECT * FROM links WHERE participation_id IN (${placeholders})`)
      .bind(...participationIds)
      .all<LinkRow>();
    links = linksRes.results;
    const tweetsRes = await c.env.DB.prepare(`SELECT * FROM tweet_infos WHERE participation_id IN (${placeholders})`)
      .bind(...participationIds)
      .all<TweetRow>();
    tweets = tweetsRes.results;
  }

  const circles = filteredRows.map((r) => serializeCircle(r, links, tweets.find((t) => t.participation_id === r.participation_id)));
  return c.json({ circles });
});

app.get("/circles/:slug", async (c) => {
  const slug = c.req.param("slug");
  const eventSlug = c.req.query("event");

  let eventId: number | null = null;
  if (eventSlug) {
    const row = await c.env.DB.prepare("SELECT id FROM events WHERE slug = ?").bind(eventSlug).first<{ id: number }>();
    eventId = row?.id ?? null;
  } else {
    const row = await c.env.DB.prepare("SELECT id FROM events WHERE status = 'active' ORDER BY start_date DESC LIMIT 1").first<{ id: number }>();
    eventId = row?.id ?? null;
  }
  if (eventId === null) return c.json({ error: "event not found" }, 404);

  const row = await c.env.DB.prepare(
    `SELECT c.id as circle_id, c.slug, c.name, p.id as participation_id, p.genre_label, p.genre_tags,
            p.booth, p.day, p.booth_url, p.highlight, p.badge, p.note, p.status,
            (SELECT GROUP_CONCAT(i.name) FROM circle_ips ci JOIN ips i ON i.id = ci.ip_id WHERE ci.circle_id = c.id) as ips
     FROM participations p
     JOIN circles c ON c.id = p.circle_id
     WHERE c.slug = ? AND p.event_id = ?`
  )
    .bind(slug, eventId)
    .first<CircleRow>();

  if (!row) return c.json({ error: "circle not found" }, 404);

  const links = (await c.env.DB.prepare("SELECT * FROM links WHERE participation_id = ?").bind(row.participation_id).all<LinkRow>()).results;
  const tweet = await c.env.DB.prepare("SELECT * FROM tweet_infos WHERE participation_id = ?").bind(row.participation_id).first<TweetRow>();

  return c.json({ circle: serializeCircle(row, links, tweet ?? undefined) });
});

// 데일리 루틴이 사용하는 증분 업데이트용: 기존 링크/genre 등을 건드리지 않고 링크만 추가 (url 중복 시 스킵)
app.post("/circles/:slug/links", async (c) => {
  const slug = c.req.param("slug");
  const body = await c.req.json();
  const { event_slug, kind, label, url } = body;
  if (!event_slug || !label || !url) {
    return c.json({ error: "event_slug, label, url가 필요해요" }, 400);
  }

  const row = await c.env.DB.prepare(
    `SELECT p.id as participation_id FROM participations p
     JOIN circles c ON c.id = p.circle_id
     JOIN events e ON e.id = p.event_id
     WHERE c.slug = ? AND e.slug = ?`
  )
    .bind(slug, event_slug)
    .first<{ participation_id: number }>();
  if (!row) return c.json({ error: "circle/event를 찾을 수 없어요" }, 404);

  const dup = await c.env.DB.prepare("SELECT id FROM links WHERE participation_id = ? AND url = ?")
    .bind(row.participation_id, url)
    .first<{ id: number }>();
  if (dup) return c.json({ ok: true, skipped: "duplicate_url" });

  const maxOrder = await c.env.DB.prepare("SELECT COALESCE(MAX(sort_order), -1) as m FROM links WHERE participation_id = ?")
    .bind(row.participation_id)
    .first<{ m: number }>();

  await c.env.DB.prepare("INSERT INTO links (participation_id, kind, label, url, sort_order) VALUES (?, ?, ?, ?, ?)")
    .bind(row.participation_id, kind ?? "other", label, url, (maxOrder?.m ?? -1) + 1)
    .run();

  return c.json({ ok: true }, 201);
});

// 데일리 루틴이 사용하는 tweetInfo upsert (링크/genre 등 다른 필드는 건드리지 않음)
app.post("/circles/:slug/tweet-info", async (c) => {
  const slug = c.req.param("slug");
  const body = await c.req.json();
  const { event_slug, url, ogTitle, ogDescription, ogImage, ogSiteName } = body;
  if (!event_slug || !url) {
    return c.json({ error: "event_slug, url이 필요해요" }, 400);
  }

  const row = await c.env.DB.prepare(
    `SELECT p.id as participation_id FROM participations p
     JOIN circles c ON c.id = p.circle_id
     JOIN events e ON e.id = p.event_id
     WHERE c.slug = ? AND e.slug = ?`
  )
    .bind(slug, event_slug)
    .first<{ participation_id: number }>();
  if (!row) return c.json({ error: "circle/event를 찾을 수 없어요" }, 404);

  await c.env.DB.prepare(
    `INSERT INTO tweet_infos (participation_id, url, og_title, og_description, og_image, og_site_name)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(participation_id) DO UPDATE SET url=excluded.url, og_title=excluded.og_title, og_description=excluded.og_description, og_image=excluded.og_image, og_site_name=excluded.og_site_name`
  )
    .bind(row.participation_id, url, ogTitle ?? null, ogDescription ?? null, ogImage ?? null, ogSiteName ?? null)
    .run();

  return c.json({ ok: true }, 201);
});

// ---- circles (write, admin) ----
app.post("/circles", async (c) => {
  const body = await c.req.json();
  const {
    slug,
    name,
    event_slug,
    genre_label,
    genre_tags,
    booth,
    day,
    booth_url,
    highlight,
    badge,
    note,
    status,
    ips,
    links,
    tweetInfo,
  } = body;

  if (!slug || !name || !event_slug) {
    return c.json({ error: "slug, name, event_slug are required" }, 400);
  }

  const event = await c.env.DB.prepare("SELECT id FROM events WHERE slug = ?").bind(event_slug).first<{ id: number }>();
  if (!event) return c.json({ error: "event not found" }, 404);

  await c.env.DB.prepare("INSERT INTO circles (slug, name) VALUES (?, ?) ON CONFLICT(slug) DO UPDATE SET name = excluded.name, updated_at = datetime('now')")
    .bind(slug, name)
    .run();
  const circle = await c.env.DB.prepare("SELECT id FROM circles WHERE slug = ?").bind(slug).first<{ id: number }>();
  if (!circle) return c.json({ error: "failed to upsert circle" }, 500);

  const existing = await c.env.DB.prepare("SELECT id FROM participations WHERE circle_id = ? AND event_id = ?")
    .bind(circle.id, event.id)
    .first<{ id: number }>();

  let participationId: number;
  if (existing) {
    await c.env.DB.prepare(
      `UPDATE participations SET genre_label=?, genre_tags=?, booth=?, day=?, booth_url=?, highlight=?, badge=?, note=?, status=COALESCE(?, status), updated_at=datetime('now') WHERE id=?`
    )
      .bind(
        genre_label ?? null,
        JSON.stringify(genre_tags ?? []),
        booth ?? null,
        day ?? null,
        booth_url ?? null,
        highlight ? 1 : 0,
        badge ?? null,
        note ?? null,
        status ?? null,
        existing.id
      )
      .run();
    participationId = existing.id;
  } else {
    const inserted = await c.env.DB.prepare(
      `INSERT INTO participations (circle_id, event_id, genre_label, genre_tags, booth, day, booth_url, highlight, badge, note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 'confirmed')) RETURNING id`
    )
      .bind(
        circle.id,
        event.id,
        genre_label ?? null,
        JSON.stringify(genre_tags ?? []),
        booth ?? null,
        day ?? null,
        booth_url ?? null,
        highlight ? 1 : 0,
        badge ?? null,
        note ?? null,
        status ?? null
      )
      .first<{ id: number }>();
    participationId = inserted!.id;
  }

  if (Array.isArray(ips)) {
    await c.env.DB.prepare("DELETE FROM circle_ips WHERE circle_id = ?").bind(circle.id).run();
    for (const ipName of ips) {
      await c.env.DB.prepare("INSERT OR IGNORE INTO ips (name) VALUES (?)").bind(ipName).run();
      await c.env.DB.prepare(
        "INSERT OR IGNORE INTO circle_ips (circle_id, ip_id) VALUES (?, (SELECT id FROM ips WHERE name = ?))"
      )
        .bind(circle.id, ipName)
        .run();
    }
  }

  if (Array.isArray(links)) {
    await c.env.DB.prepare("DELETE FROM links WHERE participation_id = ?").bind(participationId).run();
    for (let i = 0; i < links.length; i++) {
      const l = links[i];
      await c.env.DB.prepare("INSERT INTO links (participation_id, kind, label, url, sort_order) VALUES (?, ?, ?, ?, ?)")
        .bind(participationId, l.kind ?? "other", l.label, l.url, i)
        .run();
    }
  }

  if (tweetInfo) {
    await c.env.DB.prepare(
      `INSERT INTO tweet_infos (participation_id, url, og_title, og_description, og_image, og_site_name)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(participation_id) DO UPDATE SET url=excluded.url, og_title=excluded.og_title, og_description=excluded.og_description, og_image=excluded.og_image, og_site_name=excluded.og_site_name`
    )
      .bind(participationId, tweetInfo.url, tweetInfo.ogTitle ?? null, tweetInfo.ogDescription ?? null, tweetInfo.ogImage ?? null, tweetInfo.ogSiteName ?? null)
      .run();
  }

  return c.json({ ok: true, circleId: circle.id, participationId }, 201);
});

app.patch("/participations/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const key of ["genre_label", "genre_tags", "booth", "day", "booth_url", "highlight", "badge", "note", "status"]) {
    if (key in body) {
      fields.push(`${key} = ?`);
      values.push(key === "genre_tags" ? JSON.stringify(body[key]) : key === "highlight" ? (body[key] ? 1 : 0) : body[key]);
    }
  }
  if (fields.length === 0) return c.json({ error: "no fields to update" }, 400);
  fields.push("updated_at = datetime('now')");
  values.push(id);
  await c.env.DB.prepare(`UPDATE participations SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
  return c.json({ ok: true });
});

app.delete("/participations/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await c.env.DB.prepare("DELETE FROM participations WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

// ---- verification log (used by daily routine) ----
app.post("/verifications", async (c) => {
  const body = await c.req.json();
  const { circle_slug, event_slug, source, result, detail } = body;
  if (!circle_slug || !source || !result) {
    return c.json({ error: "circle_slug, source, result are required" }, 400);
  }
  const circle = await c.env.DB.prepare("SELECT id FROM circles WHERE slug = ?").bind(circle_slug).first<{ id: number }>();
  if (!circle) return c.json({ error: "circle not found" }, 404);

  let eventId: number | null = null;
  let participationId: number | null = null;
  if (event_slug) {
    const event = await c.env.DB.prepare("SELECT id FROM events WHERE slug = ?").bind(event_slug).first<{ id: number }>();
    eventId = event?.id ?? null;
    if (eventId) {
      const p = await c.env.DB.prepare("SELECT id FROM participations WHERE circle_id = ? AND event_id = ?").bind(circle.id, eventId).first<{ id: number }>();
      participationId = p?.id ?? null;
    }
  }

  await c.env.DB.prepare(
    "INSERT INTO verification_log (circle_id, participation_id, event_id, source, result, detail) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(circle.id, participationId, eventId, source, result, detail ?? null)
    .run();

  return c.json({ ok: true }, 201);
});

app.get("/verifications", async (c) => {
  const circleSlug = c.req.query("circle");
  let query = "SELECT v.*, c.slug as circle_slug FROM verification_log v JOIN circles c ON c.id = v.circle_id";
  const binds: unknown[] = [];
  if (circleSlug) {
    query += " WHERE c.slug = ?";
    binds.push(circleSlug);
  }
  query += " ORDER BY v.checked_at DESC LIMIT 200";
  const { results } = await c.env.DB.prepare(query).bind(...binds).all();
  return c.json({ verifications: results });
});
