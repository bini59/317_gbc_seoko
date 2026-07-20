import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Context } from "hono";
import {
  ValidationError,
  str,
  optStr,
  slug as vSlug,
  url as vUrl,
  optUrl,
  optEnum,
  arrOfStr,
  intId,
  optBool,
  safeJsonArray,
} from "./validate";

export type Bindings = {
  DB: D1Database;
  ADMIN_TOKEN: string;
  /** 쉼표로 구분된 허용 origin. 없으면 모든 origin 허용(*). */
  ALLOWED_ORIGINS?: string;
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

const PARTICIPATION_STATUSES = ["confirmed", "unlisted", "cancelled", "pending"] as const;

function serializeCircle(row: CircleRow, links: LinkRow[], tweet?: TweetRow) {
  return {
    id: row.circle_id,
    participationId: row.participation_id,
    slug: row.slug,
    name: row.name,
    genre: row.genre_label,
    genres: safeJsonArray(row.genre_tags),
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

/** content-type 확인 + JSON 파싱. 실패 시 ValidationError → 일관된 400. */
async function readJson(c: Context): Promise<Record<string, unknown>> {
  const ct = c.req.header("content-type") || "";
  if (!ct.includes("application/json")) {
    throw new ValidationError("content-type은 application/json이어야 해요");
  }
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError("본문이 올바른 JSON이 아니에요");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ValidationError("본문은 JSON 객체여야 해요");
  }
  return body as Record<string, unknown>;
}

export const app = new Hono<{ Bindings: Bindings }>().basePath("/api");

// 일관된 오류 응답 형식: { error: <사람이 읽는 메시지>, code: <머신용 코드> }
app.onError((err, c) => {
  if (err instanceof ValidationError) {
    return c.json({ error: err.message, code: "invalid_request" }, 400);
  }
  console.error("unhandled error:", err);
  return c.json({ error: "서버 오류가 발생했어요", code: "internal" }, 500);
});

app.use("*", cors({
  origin: (origin, c) => {
    const allowed = (c.env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
    if (allowed.length === 0) return "*";
    return allowed.includes(origin) ? origin : null;
  },
}));

// require bearer token for mutating routes only
app.use("*", async (c, next) => {
  if (["POST", "PATCH", "PUT", "DELETE"].includes(c.req.method)) {
    const auth = c.req.header("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!c.env.ADMIN_TOKEN || token !== c.env.ADMIN_TOKEN) {
      return c.json({ error: "unauthorized", code: "unauthorized" }, 401);
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
  const body = await readJson(c);
  const slug = vSlug(body.slug, "slug");
  const title = str(body.title, "title", 200);
  await c.env.DB.prepare(
    `INSERT INTO events (slug, title, alias, fare_id, date_label, start_date, end_date, venue, map_url, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 'active'))`
  )
    .bind(
      slug,
      title,
      optStr(body.alias, "alias"),
      body.fare_id === undefined || body.fare_id === null ? null : intId(body.fare_id, "fare_id"),
      optStr(body.date_label, "date_label"),
      optStr(body.start_date, "start_date"),
      optStr(body.end_date, "end_date"),
      optStr(body.venue, "venue"),
      optUrl(body.map_url, "map_url"),
      optEnum(body.status, "status", ["active", "past", "upcoming"])
    )
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
    if (!row) return c.json({ error: "event not found", code: "not_found" }, 404);
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
     WHERE p.event_id = ? AND c.event_id = p.event_id AND (? = 'all' OR p.status = ?)
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
  if (eventId === null) return c.json({ error: "event not found", code: "not_found" }, 404);

  const row = await c.env.DB.prepare(
    `SELECT c.id as circle_id, c.slug, c.name, p.id as participation_id, p.genre_label, p.genre_tags,
            p.booth, p.day, p.booth_url, p.highlight, p.badge, p.note, p.status,
            (SELECT GROUP_CONCAT(i.name) FROM circle_ips ci JOIN ips i ON i.id = ci.ip_id WHERE ci.circle_id = c.id) as ips
     FROM participations p
     JOIN circles c ON c.id = p.circle_id
     WHERE c.slug = ? AND c.event_id = ? AND p.event_id = ?`
  )
    .bind(slug, eventId, eventId)
    .first<CircleRow>();

  if (!row) return c.json({ error: "circle not found", code: "not_found" }, 404);

  const links = (await c.env.DB.prepare("SELECT * FROM links WHERE participation_id = ?").bind(row.participation_id).all<LinkRow>()).results;
  const tweet = await c.env.DB.prepare("SELECT * FROM tweet_infos WHERE participation_id = ?").bind(row.participation_id).first<TweetRow>();

  return c.json({ circle: serializeCircle(row, links, tweet ?? undefined) });
});

// participation_id 서브쿼리 — batch 안에서 slug/event로 참여 행을 참조한다.
const CIRCLE_ID_SUBQ = "(SELECT id FROM circles WHERE event_id=? AND slug=?)";
const PID_SUBQ =
  `(SELECT p.id FROM participations p WHERE p.circle_id=${CIRCLE_ID_SUBQ} AND p.event_id=?)`;

// 데일리 루틴이 사용하는 증분 업데이트용: 기존 링크/genre 등을 건드리지 않고 링크만 추가 (url 중복 시 스킵)
app.post("/circles/:slug/links", async (c) => {
  const slug = vSlug(c.req.param("slug"), "slug");
  const body = await readJson(c);
  const eventSlug = vSlug(body.event_slug, "event_slug");
  const label = str(body.label, "label", 200);
  const url = vUrl(body.url, "url");
  const kind = optStr(body.kind, "kind", 32) ?? "other";

  const row = await c.env.DB.prepare(
    `SELECT p.id as participation_id FROM participations p
     JOIN circles c ON c.id = p.circle_id
     JOIN events e ON e.id = p.event_id
     WHERE c.slug = ? AND e.slug = ? AND c.event_id = e.id`
  )
    .bind(slug, eventSlug)
    .first<{ participation_id: number }>();
  if (!row) return c.json({ error: "circle/event를 찾을 수 없어요", code: "not_found" }, 404);

  const dup = await c.env.DB.prepare("SELECT id FROM links WHERE participation_id = ? AND url = ?")
    .bind(row.participation_id, url)
    .first<{ id: number }>();
  if (dup) return c.json({ ok: true, skipped: "duplicate_url" });

  const maxOrder = await c.env.DB.prepare("SELECT COALESCE(MAX(sort_order), -1) as m FROM links WHERE participation_id = ?")
    .bind(row.participation_id)
    .first<{ m: number }>();

  await c.env.DB.prepare("INSERT INTO links (participation_id, kind, label, url, sort_order) VALUES (?, ?, ?, ?, ?)")
    .bind(row.participation_id, kind, label, url, (maxOrder?.m ?? -1) + 1)
    .run();

  return c.json({ ok: true }, 201);
});

// 데일리 루틴이 사용하는 tweetInfo upsert (링크/genre 등 다른 필드는 건드리지 않음)
app.post("/circles/:slug/tweet-info", async (c) => {
  const slug = vSlug(c.req.param("slug"), "slug");
  const body = await readJson(c);
  const eventSlug = vSlug(body.event_slug, "event_slug");
  const url = vUrl(body.url, "url");

  const row = await c.env.DB.prepare(
    `SELECT p.id as participation_id FROM participations p
     JOIN circles c ON c.id = p.circle_id
     JOIN events e ON e.id = p.event_id
     WHERE c.slug = ? AND e.slug = ? AND c.event_id = e.id`
  )
    .bind(slug, eventSlug)
    .first<{ participation_id: number }>();
  if (!row) return c.json({ error: "circle/event를 찾을 수 없어요", code: "not_found" }, 404);

  await c.env.DB.prepare(
    `INSERT INTO tweet_infos (participation_id, url, og_title, og_description, og_image, og_site_name)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(participation_id) DO UPDATE SET url=excluded.url, og_title=excluded.og_title, og_description=excluded.og_description, og_image=excluded.og_image, og_site_name=excluded.og_site_name`
  )
    .bind(
      row.participation_id,
      url,
      optStr(body.ogTitle, "ogTitle"),
      optStr(body.ogDescription, "ogDescription"),
      optUrl(body.ogImage, "ogImage"),
      optStr(body.ogSiteName, "ogSiteName")
    )
    .run();

  return c.json({ ok: true }, 201);
});

// ---- circles (write, admin) — 다중 테이블 upsert를 D1 batch로 원자화 ----
app.post("/circles", async (c) => {
  const body = await readJson(c);
  const slug = vSlug(body.slug, "slug");
  const name = str(body.name, "name", 200);
  const eventSlug = vSlug(body.event_slug, "event_slug");
  const genreLabel = optStr(body.genre_label, "genre_label");
  const genreTags = arrOfStr(body.genre_tags, "genre_tags");
  const booth = optStr(body.booth, "booth", 64);
  const day = optStr(body.day, "day", 32);
  const boothUrl = optUrl(body.booth_url, "booth_url");
  const highlight = optBool(body.highlight);
  const badge = optStr(body.badge, "badge", 64);
  const note = optStr(body.note, "note");
  const status = optEnum(body.status, "status", PARTICIPATION_STATUSES);
  const ips = body.ips === undefined ? null : arrOfStr(body.ips, "ips", 128);
  const links =
    body.links === undefined
      ? null
      : (Array.isArray(body.links) ? body.links : [])
          .map((l: any, i: number) => ({
            kind: optStr(l?.kind, `links[${i}].kind`, 32) ?? "other",
            label: str(l?.label, `links[${i}].label`, 200),
            url: vUrl(l?.url, `links[${i}].url`),
          }));
  if (body.links !== undefined && !Array.isArray(body.links)) {
    throw new ValidationError("links: 배열이어야 해요");
  }
  const tweetInfo = body.tweetInfo
    ? {
        url: vUrl((body.tweetInfo as any).url, "tweetInfo.url"),
        ogTitle: optStr((body.tweetInfo as any).ogTitle, "tweetInfo.ogTitle"),
        ogDescription: optStr((body.tweetInfo as any).ogDescription, "tweetInfo.ogDescription"),
        ogImage: optUrl((body.tweetInfo as any).ogImage, "tweetInfo.ogImage"),
        ogSiteName: optStr((body.tweetInfo as any).ogSiteName, "tweetInfo.ogSiteName"),
      }
    : null;

  const event = await c.env.DB.prepare("SELECT id FROM events WHERE slug = ?").bind(eventSlug).first<{ id: number }>();
  if (!event) return c.json({ error: "event not found", code: "not_found" }, 404);
  const eventId = event.id;

  const db = c.env.DB;
  const stmts: D1PreparedStatement[] = [];

  // 1) circle upsert
  stmts.push(
    db
      .prepare("INSERT INTO circles (event_id, slug, name) VALUES (?, ?, ?) ON CONFLICT(event_id, slug) DO UPDATE SET name = excluded.name, updated_at = datetime('now')")
      .bind(eventId, slug, name)
  );

  // 2) participation upsert (UNIQUE(circle_id, event_id) 기반)
  stmts.push(
    db
      .prepare(
        `INSERT INTO participations (circle_id, event_id, genre_label, genre_tags, booth, day, booth_url, highlight, badge, note, status)
         VALUES (${CIRCLE_ID_SUBQ}, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 'confirmed'))
         ON CONFLICT(circle_id, event_id) DO UPDATE SET
           genre_label=excluded.genre_label, genre_tags=excluded.genre_tags, booth=excluded.booth,
           day=excluded.day, booth_url=excluded.booth_url, highlight=excluded.highlight,
           badge=excluded.badge, note=excluded.note, status=COALESCE(?, participations.status),
           updated_at=datetime('now')`
      )
      .bind(eventId, slug, eventId, genreLabel, JSON.stringify(genreTags), booth, day, boothUrl, highlight ? 1 : 0, badge, note, status, status)
  );

  // 3) ips (제공된 경우만 전량 교체)
  if (ips !== null) {
    stmts.push(db.prepare(`DELETE FROM circle_ips WHERE circle_id=${CIRCLE_ID_SUBQ}`).bind(eventId, slug));
    for (const ipName of ips) {
      stmts.push(db.prepare("INSERT OR IGNORE INTO ips (name) VALUES (?)").bind(ipName));
      stmts.push(
        db
          .prepare(`INSERT OR IGNORE INTO circle_ips (circle_id, ip_id) VALUES (${CIRCLE_ID_SUBQ}, (SELECT id FROM ips WHERE name=?))`)
          .bind(eventId, slug, ipName)
      );
    }
  }

  // 4) links (제공된 경우만 전량 교체)
  if (links !== null) {
    stmts.push(db.prepare(`DELETE FROM links WHERE participation_id=${PID_SUBQ}`).bind(eventId, slug, eventId));
    for (let i = 0; i < links.length; i++) {
      const l = links[i];
      stmts.push(
        db
          .prepare(`INSERT INTO links (participation_id, kind, label, url, sort_order) VALUES (${PID_SUBQ}, ?, ?, ?, ?)`)
          .bind(eventId, slug, eventId, l.kind, l.label, l.url, i)
      );
    }
  }

  // 5) tweetInfo
  if (tweetInfo) {
    stmts.push(
      db
        .prepare(
          `INSERT INTO tweet_infos (participation_id, url, og_title, og_description, og_image, og_site_name)
           VALUES (${PID_SUBQ}, ?, ?, ?, ?, ?)
           ON CONFLICT(participation_id) DO UPDATE SET url=excluded.url, og_title=excluded.og_title, og_description=excluded.og_description, og_image=excluded.og_image, og_site_name=excluded.og_site_name`
        )
        .bind(eventId, slug, eventId, tweetInfo.url, tweetInfo.ogTitle, tweetInfo.ogDescription, tweetInfo.ogImage, tweetInfo.ogSiteName)
    );
  }

  await db.batch(stmts); // 전부 성공 또는 전부 롤백

  const ids = await db
    .prepare(
      "SELECT c.id as circle_id, p.id as participation_id FROM circles c JOIN participations p ON p.circle_id=c.id WHERE c.event_id=? AND c.slug=? AND p.event_id=?"
    )
    .bind(eventId, slug, eventId)
    .first<{ circle_id: number; participation_id: number }>();
  return c.json({ ok: true, circleId: ids?.circle_id, participationId: ids?.participation_id }, 201);
});

app.patch("/participations/:id", async (c) => {
  const id = intId(c.req.param("id"), "id");
  const body = await readJson(c);
  const fields: string[] = [];
  const values: unknown[] = [];
  const add = (col: string, val: unknown) => {
    fields.push(`${col} = ?`);
    values.push(val);
  };
  if ("genre_label" in body) add("genre_label", optStr(body.genre_label, "genre_label"));
  if ("genre_tags" in body) add("genre_tags", JSON.stringify(arrOfStr(body.genre_tags, "genre_tags")));
  if ("booth" in body) add("booth", optStr(body.booth, "booth", 64));
  if ("day" in body) add("day", optStr(body.day, "day", 32));
  if ("booth_url" in body) add("booth_url", optUrl(body.booth_url, "booth_url"));
  if ("highlight" in body) add("highlight", optBool(body.highlight) ? 1 : 0);
  if ("badge" in body) add("badge", optStr(body.badge, "badge", 64));
  if ("note" in body) add("note", optStr(body.note, "note"));
  if ("status" in body) add("status", optEnum(body.status, "status", PARTICIPATION_STATUSES));
  if (fields.length === 0) throw new ValidationError("수정할 필드가 없어요");

  fields.push("updated_at = datetime('now')");
  values.push(id);
  const res = await c.env.DB.prepare(`UPDATE participations SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
  if (!res.meta.changes) return c.json({ error: "participation not found", code: "not_found" }, 404);
  return c.json({ ok: true });
});

app.delete("/participations/:id", async (c) => {
  const id = intId(c.req.param("id"), "id");
  const res = await c.env.DB.prepare("DELETE FROM participations WHERE id = ?").bind(id).run();
  if (!res.meta.changes) return c.json({ error: "participation not found", code: "not_found" }, 404);
  return c.json({ ok: true });
});

// ---- verification log (used by daily routine) ----
app.post("/verifications", async (c) => {
  const body = await readJson(c);
  const circleSlug = vSlug(body.circle_slug, "circle_slug");
  const source = str(body.source, "source", 64);
  const result = str(body.result, "result", 64);
  const detail = optStr(body.detail, "detail");
  const eventSlug = vSlug(body.event_slug, "event_slug");

  const target = await c.env.DB.prepare(
    `SELECT c.id AS circle_id, p.id AS participation_id, e.id AS event_id
     FROM circles c
     JOIN events e ON e.id = c.event_id
     LEFT JOIN participations p ON p.circle_id = c.id AND p.event_id = e.id
     WHERE c.slug = ? AND e.slug = ?`
  ).bind(circleSlug, eventSlug).first<{ circle_id: number; participation_id: number | null; event_id: number }>();
  if (!target) return c.json({ error: "circle/event를 찾을 수 없어요", code: "not_found" }, 404);

  await c.env.DB.prepare(
    "INSERT INTO verification_log (circle_id, participation_id, event_id, source, result, detail) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(target.circle_id, target.participation_id, target.event_id, source, result, detail)
    .run();

  return c.json({ ok: true }, 201);
});

app.get("/verifications", async (c) => {
  const circleSlug = c.req.query("circle");
  const eventSlug = c.req.query("event");
  let query = `SELECT v.*, c.slug as circle_slug
               FROM verification_log v
               JOIN circles c ON c.id = v.circle_id
               LEFT JOIN events e ON e.id = v.event_id`;
  const binds: unknown[] = [];
  const conditions: string[] = [];
  if (circleSlug) {
    conditions.push("c.slug = ?");
    binds.push(circleSlug);
  }
  if (eventSlug) {
    conditions.push("e.slug = ?");
    binds.push(eventSlug);
  }
  if (conditions.length > 0) query += ` WHERE ${conditions.join(" AND ")}`;
  query += " ORDER BY v.checked_at DESC LIMIT 200";
  const { results } = await c.env.DB.prepare(query).bind(...binds).all();
  return c.json({ verifications: results });
});
