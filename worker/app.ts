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
  dateOnly,
  wishlistMap,
  wishlistEvents,
} from "./validate";
import { md5Hex } from "./md5";

export type Bindings = {
  DB: D1Database;
  ADMIN_TOKEN: string;
  ALLOWED_ORIGINS?: string;
  AUTH_ORIGIN?: string;
  AUTH_CLIENT_ID?: string;
  AUTH_CLIENT_SECRET?: string;
  EMAIL?: SendEmail;
  FEEDBACK_TO?: string;
};

type AuthenticatedUser = {
  userId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  membership: { role: string; status: string; joinedAt: string } | null;
};

function authConfigured(env: Bindings): boolean {
  return Boolean(env.AUTH_ORIGIN && env.AUTH_CLIENT_ID && env.AUTH_CLIENT_SECRET);
}

async function verifyAuth(c: Context<{ Bindings: Bindings }>): Promise<AuthenticatedUser | null> {
  if (!authConfigured(c.env)) return null;
  const cookie = c.req.header("cookie");
  if (!cookie) return null;
  const url = new URL("/verify", c.env.AUTH_ORIGIN);
  url.searchParams.set("client_id", c.env.AUTH_CLIENT_ID!);
  const response = await fetch(url.toString(), {
    headers: { "x-app-secret": c.env.AUTH_CLIENT_SECRET!, cookie },
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error("auth verification failed");
  return await response.json<AuthenticatedUser>();
}

async function requireAuth(c: Context<{ Bindings: Bindings }>): Promise<AuthenticatedUser | Response> {
  if (!authConfigured(c.env)) return c.json({ error: "auth is not configured", code: "auth_unavailable" }, 503);
  const user = await verifyAuth(c);
  return user ?? c.json({ error: "unauthorized", code: "unauthorized" }, 401);
}

type CircleRow = {
  circle_id: number;
  slug: string;
  name: string;
  participation_id: number;
  booth: string | null;
  day: string | null;
  booth_url: string | null;
  highlight: number;
  badge: string | null;
  note: string | null;
  status: string;
  ips: string | null;
};

type LinkRow = { id: number; participation_id: number; kind: string; label: string; url: string; sort_order: number };
type TweetRow = {
  participation_id: number;
  url: string;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  og_site_name: string | null;
};

type EventStatus = "active" | "past" | "upcoming";
type EventStatusRow = {
  id: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
};

type UserChecksRow = { checks: string; updated_at: string };
type UserWishlistRow = { starred: number; circles: string; starred_at: string | null; circles_updated_at: string | null };

const CHECKS_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MAX_CLIENT_CLOCK_AHEAD_MS = 5 * 60 * 1000;

function normalizeChecksTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !CHECKS_TIMESTAMP_RE.test(value)) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function formatStoredChecksTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function nextServerTimestamp(current: string | null, requested: string | null): string {
  const now = Date.now();
  const currentTime = current ? Date.parse(current) : Number.NaN;
  const requestedTime = requested ? Date.parse(requested) : Number.NaN;
  return new Date(Math.max(
    now,
    Number.isNaN(currentTime) ? 0 : currentTime + 1,
    Number.isNaN(requestedTime) ? 0 : requestedTime,
  )).toISOString();
}

function parseStoredChecks(value: string): Record<string, boolean> {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).map(([key, item]) => [key, item === true]));
  } catch {
    return {};
  }
}

export function determineEventStatus(
  event: Pick<EventStatusRow, "start_date" | "end_date" | "status">,
  today = new Date().toISOString().slice(0, 10),
): EventStatus | string {
  if (event.start_date && event.start_date > today) return "upcoming";
  if (event.end_date && event.end_date < today) return "past";
  if (event.start_date || event.end_date) return "active";
  return event.status;
}

async function refreshEventStatuses(db: D1Database, today = new Date().toISOString().slice(0, 10)) {
  const { results } = await db.prepare("SELECT id, start_date, end_date, status FROM events").all<EventStatusRow>();
  const updates = results
    .map((event) => ({ event, status: determineEventStatus(event, today) }))
    .filter(({ event, status }) => status !== event.status)
    .map(({ event, status }) => db.prepare("UPDATE events SET status = ? WHERE id = ?").bind(status, event.id));
  if (updates.length > 0) await db.batch(updates);
}

const PARTICIPATION_STATUSES = ["confirmed", "unlisted", "cancelled", "pending"] as const;

function serializeCircle(row: CircleRow, links: LinkRow[], tweet?: TweetRow) {
  return {
    id: row.circle_id,
    participationId: row.participation_id,
    slug: row.slug,
    name: row.name,
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
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
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
async function readJson(c: Context, maxBytes = 256 * 1024): Promise<Record<string, unknown>> {
  const ct = c.req.header("content-type") || "";
  if (!ct.includes("application/json")) {
    throw new ValidationError("content-type은 application/json이어야 해요");
  }
  const contentLength = Number(c.req.header("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new ValidationError("본문이 너무 커요");
  }
  let body: unknown;
  try {
    const raw = await c.req.text();
    if (new TextEncoder().encode(raw).byteLength > maxBytes) throw new ValidationError("본문이 너무 커요");
    body = JSON.parse(raw);
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError("본문이 올바른 JSON이 아니에요");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ValidationError("본문은 JSON 객체여야 해요");
  }
  return body as Record<string, unknown>;
}

function sessionMutationAllowed(c: Context<{ Bindings: Bindings }>): boolean {
  const site = c.req.header("sec-fetch-site");
  const origin = c.req.header("origin");
  if (site === "cross-site") return false;
  if (origin && origin !== new URL(c.req.url).origin) {
    const allowed = (c.env.ALLOWED_ORIGINS || "").split(",").map((item) => item.trim()).filter(Boolean);
    if (!allowed.includes(origin)) return false;
  }
  return true;
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
  credentials: true,
  origin: (origin, c) => {
    const allowed = (c.env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
    if (allowed.length === 0) return "*";
    return allowed.includes(origin) ? origin : null;
  },
}));

// require bearer token for mutating routes only (session-cookie routes are exempt)
const SESSION_ROUTES = ["/api/checks", "/api/wishlist", "/api/auth/logout", "/api/feedback"];
app.use("*", async (c, next) => {
  if (["POST", "PATCH", "PUT", "DELETE"].includes(c.req.method) && !SESSION_ROUTES.includes(c.req.path)) {
    const auth = c.req.header("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!c.env.ADMIN_TOKEN || token !== c.env.ADMIN_TOKEN) {
      return c.json({ error: "unauthorized", code: "unauthorized" }, 401);
    }
  }
  await next();
});

// ---- events ----
app.get("/auth/me", async (c) => {
  const user = await verifyAuth(c);
  return c.json({ enabled: authConfigured(c.env), user });
});

// 321_auth `/logout`은 POST + CSRF double-submit 전용이라 브라우저가 직접 못 부른다.
// 워커가 sid를 대신 넘겨 서버 간 POST로 세션을 revoke하고, 로컬 sid 쿠키를 지운다.
app.post("/auth/logout", async (c) => {
  // 우리 라우트가 321_auth의 CSRF 가드를 대신 만족시키므로, 타 출처 폼 POST로 강제 로그아웃되지 않게 출처를 확인한다.
  if (!sessionMutationAllowed(c)) return c.json({ error: "forbidden", code: "forbidden" }, 403);

  const sid = /(?:^|;\s*)sid=([A-Za-z0-9._~+/=-]+)/.exec(c.req.header("cookie") ?? "")?.[1];
  let revoked = false;
  if (sid && authConfigured(c.env)) {
    const csrf = crypto.randomUUID();
    const url = new URL("/logout", c.env.AUTH_ORIGIN);
    url.searchParams.set("client_id", c.env.AUTH_CLIENT_ID!);
    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { cookie: `sid=${sid}; csrf=${csrf}`, "x-csrf-token": csrf },
        redirect: "manual",
        signal: AbortSignal.timeout(3000),
      });
      revoked = res.ok || res.status === 302;
      if (!revoked) console.error("321_auth logout revoke failed", res.status);
    } catch (error) {
      // revoke가 실패해도 로컬 쿠키는 지워 반쯤 로그아웃된 상태를 피한다.
      console.error("321_auth logout revoke error", error);
    }
  }
  // sid는 321_auth가 상위 도메인(.bini59.dev)으로 심으므로 host-only와 상위 도메인 둘 다 지운다.
  const expired = "sid=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax";
  c.header("set-cookie", expired, { append: true });
  const parent = c.env.AUTH_ORIGIN ? new URL(c.env.AUTH_ORIGIN).hostname.split(".").slice(1).join(".") : "";
  if (parent.includes(".")) c.header("set-cookie", `${expired}; Domain=${parent}`, { append: true });
  return c.json({ ok: true, revoked });
});

// 문의·피드백 — 로그인 불필요. 조회는 `wrangler d1 execute gbc-seoko-db --remote --command "SELECT * FROM feedback ORDER BY id DESC"`.
// ponytail: 레이트리밋 없음(본문 2000자 + readJson 크기 제한만). 스팸 생기면 Cloudflare WAF rate rule을 /api/feedback에 붙인다.
app.post("/feedback", async (c) => {
  const body = await readJson(c, 16 * 1024);
  const message = str(body.message, "message", 2000);
  const contact = optStr(body.contact, "contact", 200);
  const user = await verifyAuth(c).catch(() => null);
  await c.env.DB.prepare("INSERT INTO feedback (message, contact, user_id, user_agent) VALUES (?, ?, ?, ?)")
    .bind(message.trim(), contact?.trim() || null, user?.userId ?? null, (c.req.header("user-agent") || "").slice(0, 300))
    .run();
  // 메일 전달은 선택 — Email Sending이 유료라 현재 꺼둠. 켜려면 wrangler.jsonc에 send_email 바인딩(EMAIL)과 FEEDBACK_TO만 추가.
  if (c.env.EMAIL && c.env.FEEDBACK_TO) {
    const to = c.env.FEEDBACK_TO;
    c.executionCtx.waitUntil(
      c.env.EMAIL.send({
        from: { email: `noreply@${to.split("@")[1]}`, name: "seoko-maps 피드백" },
        to,
        subject: `[seoko-maps 피드백] ${message.trim().slice(0, 40)}`,
        text: `${message.trim()}\n\n연락처: ${contact?.trim() || "(없음)"}\n사용자: ${user?.userId ?? "(비로그인)"}`,
      }).catch((error) => console.error("feedback email failed", error)),
    );
  }
  return c.json({ ok: true }, 201);
});

app.get("/checks", async (c) => {
  const eventSlug = vSlug(c.req.query("event"), "event");
  const user = await requireAuth(c);
  if (user instanceof Response) return user;
  const row = await c.env.DB.prepare("SELECT checks, updated_at FROM user_checks WHERE user_id = ? AND event_slug = ?")
    .bind(user.userId, eventSlug)
    .first<UserChecksRow>();
  return c.json({ checks: row ? parseStoredChecks(row.checks) : {}, updatedAt: formatStoredChecksTimestamp(row?.updated_at) });
});

app.put("/checks", async (c) => {
  if (!sessionMutationAllowed(c)) return c.json({ error: "forbidden", code: "forbidden" }, 403);
  const eventSlug = vSlug(c.req.query("event"), "event");
  const user = await requireAuth(c);
  if (user instanceof Response) return user;
  const body = await readJson(c, 256 * 1024);
  const checks = body.checks;
  if (typeof checks !== "object" || checks === null || Array.isArray(checks)) {
    throw new ValidationError("checks는 JSON 객체여야 해요");
  }
  const checkMap = checks as Record<string, unknown>;
  const keys = Object.keys(checkMap);
  if (keys.length > 3000 || keys.some((key) => key.length > 200)) {
    throw new ValidationError("방문 체크 항목이 너무 많거나 길어요");
  }
  if (keys.some((key) => typeof checkMap[key] !== "boolean")) {
    throw new ValidationError("checks의 값은 boolean이어야 해요");
  }
  const normalized = checkMap as Record<string, boolean>;
  const requestedAt = body.updatedAt === undefined || body.updatedAt === null
    ? null
    : normalizeChecksTimestamp(body.updatedAt);
  if (body.updatedAt !== undefined && body.updatedAt !== null && requestedAt === null) {
    throw new ValidationError("updatedAt은 UTC 밀리초 ISO 시각이어야 해요");
  }

  // A client timestamp derived from a server response is accepted, but a badly
  // skewed client clock must not manufacture a future version over current data.
  if (requestedAt && Date.parse(requestedAt) > Date.now() + MAX_CLIENT_CLOCK_AHEAD_MS) {
    const current = await c.env.DB.prepare("SELECT checks, updated_at FROM user_checks WHERE user_id = ? AND event_slug = ?")
      .bind(user.userId, eventSlug)
      .first<UserChecksRow>();
    return c.json({
      checks: current ? parseStoredChecks(current.checks) : {},
      updatedAt: formatStoredChecksTimestamp(current?.updated_at),
      saved: false,
      conflict: "clock_skew",
    });
  }

  // The comparison is repeated in the conditional UPDATE, so a request that
  // races another request cannot overwrite a newer row between SELECT and UPDATE.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await c.env.DB.prepare("SELECT checks, updated_at FROM user_checks WHERE user_id = ? AND event_slug = ?")
      .bind(user.userId, eventSlug)
      .first<UserChecksRow>();
    const rawCurrentAt = current?.updated_at ?? null;
    const currentAt = formatStoredChecksTimestamp(rawCurrentAt);

    // Missing timestamps are legacy/unknown writes and are never allowed to
    // replace an existing server snapshot. They may still create the first row.
    if (current && currentAt && (!requestedAt || Date.parse(requestedAt) <= Date.parse(currentAt))) {
      return c.json({ checks: parseStoredChecks(current.checks), updatedAt: currentAt, saved: false, conflict: "stale" });
    }

    const savedAt = nextServerTimestamp(currentAt, requestedAt);
    if (!current) {
      const inserted = await c.env.DB.prepare(
        "INSERT INTO user_checks (user_id, event_slug, checks, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, event_slug) DO NOTHING",
      ).bind(user.userId, eventSlug, JSON.stringify(normalized), savedAt).run();
      if (Number((inserted.meta as { changes?: number } | undefined)?.changes ?? 0) > 0) {
        return c.json({ checks: normalized, updatedAt: savedAt, saved: true });
      }
      continue;
    }

    const updated = await c.env.DB.prepare(
      "UPDATE user_checks SET checks = ?, updated_at = ? WHERE user_id = ? AND event_slug = ? AND updated_at = ? AND updated_at < ?",
    ).bind(JSON.stringify(normalized), savedAt, user.userId, eventSlug, rawCurrentAt, savedAt).run();
    if (Number((updated.meta as { changes?: number } | undefined)?.changes ?? 0) > 0) {
      return c.json({ checks: normalized, updatedAt: savedAt, saved: true });
    }
  }

  const latest = await c.env.DB.prepare("SELECT checks, updated_at FROM user_checks WHERE user_id = ? AND event_slug = ?")
    .bind(user.userId, eventSlug)
    .first<UserChecksRow>();
  return c.json({ checks: latest ? parseStoredChecks(latest.checks) : {}, updatedAt: formatStoredChecksTimestamp(latest?.updated_at), saved: false, conflict: "stale" });
});

function parseWishlistCircles(value: string): Record<string, { star?: boolean; memo?: string }> {
  try {
    return wishlistMap(JSON.parse(value));
  } catch {
    return {};
  }
}

app.get("/wishlist", async (c) => {
  const user = await requireAuth(c);
  if (user instanceof Response) return user;
  const eventSlug = c.req.query("event");
  if (eventSlug) {
    vSlug(eventSlug, "event");
    const event = await c.env.DB.prepare("SELECT slug FROM events WHERE slug = ?").bind(eventSlug).first<{ slug: string }>();
    if (!event) return c.json({ error: "event not found", code: "not_found" }, 404);
    const row = await c.env.DB.prepare("SELECT circles, circles_updated_at FROM user_wishlist WHERE user_id = ? AND event_slug = ?")
      .bind(user.userId, eventSlug).first<UserWishlistRow>();
    return c.json({ circles: row ? parseWishlistCircles(row.circles) : {}, updatedAt: formatStoredChecksTimestamp(row?.circles_updated_at) });
  }
  const { results } = await c.env.DB.prepare("SELECT event_slug FROM user_wishlist WHERE user_id = ? AND starred = 1 ORDER BY event_slug")
    .bind(user.userId).all<{ event_slug: string }>();
  const latest = await c.env.DB.prepare("SELECT updated_at FROM user_wishlist_version WHERE user_id = ?")
    .bind(user.userId).first<{ updated_at: string | null }>();
  if (latest) return c.json({ events: results.map((row) => row.event_slug), updatedAt: formatStoredChecksTimestamp(latest.updated_at) });
  const fallback = await c.env.DB.prepare("SELECT MAX(starred_at) as max_at FROM user_wishlist WHERE user_id = ?")
    .bind(user.userId).first<{ max_at: string | null }>();
  return c.json({ events: results.map((row) => row.event_slug), updatedAt: formatStoredChecksTimestamp(fallback?.max_at) });
});

app.put("/wishlist", async (c) => {
  if (!sessionMutationAllowed(c)) return c.json({ error: "forbidden", code: "forbidden" }, 403);
  const user = await requireAuth(c);
  if (user instanceof Response) return user;
  const eventSlug = c.req.query("event");
  const body = await readJson(c, 512 * 1024);
  const requestedAt = body.updatedAt === undefined || body.updatedAt === null ? null : normalizeChecksTimestamp(body.updatedAt);
  if (body.updatedAt !== undefined && body.updatedAt !== null && !requestedAt) throw new ValidationError("updatedAt은 UTC 밀리초 ISO 시각이어야 해요");
  if (eventSlug) {
    vSlug(eventSlug, "event");
    const event = await c.env.DB.prepare("SELECT slug FROM events WHERE slug = ?").bind(eventSlug).first<{ slug: string }>();
    if (!event) return c.json({ error: "event not found", code: "invalid_request" }, 400);
    const circles = wishlistMap(body.circles);
    const circleRows = (await c.env.DB.prepare(
      "SELECT c.id AS circle_id FROM circles c JOIN participations p ON p.circle_id = c.id WHERE c.event_id = (SELECT id FROM events WHERE slug = ?) AND p.event_id = (SELECT id FROM events WHERE slug = ?)",
    ).bind(eventSlug, eventSlug).all<{ circle_id: number }>()).results;
    const validCircleIds = new Set(circleRows.map((row) => row.circle_id));
    for (const circleId of Object.keys(circles)) if (!validCircleIds.has(Number(circleId))) delete circles[circleId];

    if (requestedAt && Date.parse(requestedAt) > Date.now() + MAX_CLIENT_CLOCK_AHEAD_MS) {
      const current = await c.env.DB.prepare("SELECT circles, circles_updated_at FROM user_wishlist WHERE user_id = ? AND event_slug = ?")
        .bind(user.userId, eventSlug)
        .first<UserWishlistRow>();
      return c.json({
        circles: current ? parseWishlistCircles(current.circles) : {},
        updatedAt: formatStoredChecksTimestamp(current?.circles_updated_at),
        saved: false,
        conflict: "clock_skew",
      });
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const current = await c.env.DB.prepare("SELECT circles, circles_updated_at FROM user_wishlist WHERE user_id = ? AND event_slug = ?")
        .bind(user.userId, eventSlug).first<UserWishlistRow>();
      const rawCurrentAt = current?.circles_updated_at ?? null;
      const currentAt = formatStoredChecksTimestamp(rawCurrentAt);
      if (current && currentAt && (!requestedAt || Date.parse(requestedAt) <= Date.parse(currentAt))) {
        return c.json({ circles: parseWishlistCircles(current.circles), updatedAt: currentAt, saved: false, conflict: "stale" });
      }
      const savedAt = nextServerTimestamp(currentAt, requestedAt);
      if (!current) {
        const inserted = await c.env.DB.prepare("INSERT INTO user_wishlist (user_id, event_slug, circles, starred, circles_updated_at) VALUES (?, ?, ?, 0, ?) ON CONFLICT(user_id, event_slug) DO NOTHING")
          .bind(user.userId, eventSlug, JSON.stringify(circles), savedAt).run();
        if (Number((inserted.meta as { changes?: number } | undefined)?.changes ?? 0) > 0) {
          return c.json({ circles, updatedAt: savedAt, saved: true });
        }
        continue;
      }
      if (rawCurrentAt === null) {
        const updated = await c.env.DB.prepare("UPDATE user_wishlist SET circles = ?, circles_updated_at = ? WHERE user_id = ? AND event_slug = ? AND circles_updated_at IS NULL")
          .bind(JSON.stringify(circles), savedAt, user.userId, eventSlug).run();
        if (Number((updated.meta as { changes?: number } | undefined)?.changes ?? 0) > 0) {
          return c.json({ circles, updatedAt: savedAt, saved: true });
        }
      } else {
        const updated = await c.env.DB.prepare("UPDATE user_wishlist SET circles = ?, circles_updated_at = ? WHERE user_id = ? AND event_slug = ? AND circles_updated_at = ? AND circles_updated_at < ?")
          .bind(JSON.stringify(circles), savedAt, user.userId, eventSlug, rawCurrentAt, savedAt).run();
        if (Number((updated.meta as { changes?: number } | undefined)?.changes ?? 0) > 0) {
          return c.json({ circles, updatedAt: savedAt, saved: true });
        }
      }
    }
    const latest = await c.env.DB.prepare("SELECT circles, circles_updated_at FROM user_wishlist WHERE user_id = ? AND event_slug = ?")
      .bind(user.userId, eventSlug).first<UserWishlistRow>();
    return c.json({ circles: latest ? parseWishlistCircles(latest.circles) : {}, updatedAt: formatStoredChecksTimestamp(latest?.circles_updated_at), saved: false, conflict: "stale" });
  }

  const events = wishlistEvents(body.events);
  const knownEvents = (await c.env.DB.prepare("SELECT slug FROM events").all<{ slug: string }>()).results.map((row) => row.slug);
  if (events.some((event) => !knownEvents.includes(event))) return c.json({ error: "event not found", code: "invalid_request" }, 400);

  const currentRows = (await c.env.DB.prepare("SELECT event_slug FROM user_wishlist WHERE user_id = ? AND starred = 1 ORDER BY event_slug").bind(user.userId).all<{ event_slug: string }>()).results;
  const currentEvents = currentRows.map((row) => row.event_slug);
  const currentVersion = await c.env.DB.prepare("SELECT updated_at FROM user_wishlist_version WHERE user_id = ?").bind(user.userId).first<{ updated_at: string | null }>();
  const currentAtRow = await c.env.DB.prepare("SELECT MAX(starred_at) as max_at FROM user_wishlist WHERE user_id = ?").bind(user.userId).first<{ max_at: string | null }>();
  const currentAt = formatStoredChecksTimestamp(currentVersion?.updated_at ?? currentAtRow?.max_at);

  if (requestedAt && Date.parse(requestedAt) > Date.now() + MAX_CLIENT_CLOCK_AHEAD_MS) {
    return c.json({ events: currentEvents, updatedAt: currentAt, saved: false, conflict: "clock_skew" });
  }

  if (currentAt && (!requestedAt || Date.parse(requestedAt) <= Date.parse(currentAt))) {
    return c.json({ events: currentEvents, updatedAt: currentAt, saved: false, conflict: "stale" });
  }

  const savedAt = nextServerTimestamp(currentAt, requestedAt);
  const batchResults = await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO user_wishlist_version (user_id, updated_at) VALUES (?, ?) ON CONFLICT(user_id) DO NOTHING").bind(user.userId, currentAt),
    currentVersion || currentAt
      ? c.env.DB.prepare("UPDATE user_wishlist_version SET updated_at = ? WHERE user_id = ? AND updated_at = ? AND updated_at < ?").bind(savedAt, user.userId, currentVersion?.updated_at ?? currentAt, savedAt)
      : c.env.DB.prepare("UPDATE user_wishlist_version SET updated_at = ? WHERE user_id = ? AND updated_at IS NULL").bind(savedAt, user.userId),
    c.env.DB.prepare("UPDATE user_wishlist SET starred = 0, starred_at = ? WHERE user_id = ? AND starred = 1 AND EXISTS (SELECT 1 FROM user_wishlist_version WHERE user_id = ? AND updated_at = ?)").bind(savedAt, user.userId, user.userId, savedAt),
    ...events.map((event) => c.env.DB.prepare("INSERT INTO user_wishlist (user_id, event_slug, starred, starred_at) SELECT ?, ?, 1, ? WHERE EXISTS (SELECT 1 FROM user_wishlist_version WHERE user_id = ? AND updated_at = ?) ON CONFLICT(user_id, event_slug) DO UPDATE SET starred = 1, starred_at = excluded.starred_at").bind(user.userId, event, savedAt, user.userId, savedAt)),
  ]);
  const versionResult = batchResults[1] as { meta?: { changes?: number } } | undefined;
  if (Number(versionResult?.meta?.changes ?? 0) === 0) {
    const latestRows = (await c.env.DB.prepare("SELECT event_slug FROM user_wishlist WHERE user_id = ? AND starred = 1 ORDER BY event_slug").bind(user.userId).all<{ event_slug: string }>()).results;
    const latestVersion = await c.env.DB.prepare("SELECT updated_at FROM user_wishlist_version WHERE user_id = ?").bind(user.userId).first<{ updated_at: string | null }>();
    return c.json({ events: latestRows.map((row) => row.event_slug), updatedAt: formatStoredChecksTimestamp(latestVersion?.updated_at), saved: false, conflict: "stale" });
  }
  return c.json({ events, updatedAt: savedAt, saved: true });
});

app.get("/events", async (c) => {
  c.executionCtx.waitUntil(
    refreshEventStatuses(c.env.DB).catch((error) => {
      console.error("event status refresh failed", error);
    }),
  );
  const { results } = await c.env.DB.prepare(
    "SELECT id, slug, title, alias, fare_id, date_label, start_date, end_date, venue, map_url, status FROM events ORDER BY start_date DESC, id DESC"
  ).all<EventStatusRow & Record<string, unknown>>();
  const today = new Date().toISOString().slice(0, 10);
  const events = results.map((event) => ({ ...event, status: determineEventStatus(event, today) }));
  const meta = { schemaVersion: 1, hash: await md5Hex(JSON.stringify(events)) };
  if (c.req.query("metadata") === "1") return c.json({ meta });
  return c.json({ events, meta });
});

app.post("/events", async (c) => {
  const body = await readJson(c);
  const slug = vSlug(body.slug, "slug");
  const title = str(body.title, "title", 200);
  const startDate = body.start_date === undefined || body.start_date === null ? null : dateOnly(body.start_date, "start_date");
  const endDate = body.end_date === undefined || body.end_date === null ? null : dateOnly(body.end_date, "end_date");
  if (startDate && endDate && endDate < startDate) throw new ValidationError("end_date는 start_date보다 빠를 수 없어요");
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
      startDate,
      endDate,
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
    const today = new Date().toISOString().slice(0, 10);
    const row = await c.env.DB.prepare(
      "SELECT id FROM events WHERE ((start_date IS NULL AND end_date IS NULL AND status = 'active') OR ((start_date IS NULL OR start_date <= ?) AND (end_date IS NULL OR end_date >= ?))) ORDER BY start_date DESC LIMIT 1",
    ).bind(today, today).first<{ id: number }>();
    eventId = row?.id ?? null;
  }
  if (eventId === null) return c.json({ circles: [] });

  const { results: rows } = await c.env.DB.prepare(
    `SELECT c.id as circle_id, c.slug, c.name, p.id as participation_id,
            p.booth, p.day, p.booth_url, p.highlight, p.badge, p.note, p.status,
            (SELECT GROUP_CONCAT(i.name) FROM circle_ips ci JOIN ips i ON i.id = ci.ip_id WHERE ci.circle_id = c.id) as ips
     FROM participations p
     JOIN circles c ON c.id = p.circle_id
     WHERE p.event_id = ? AND c.event_id = p.event_id AND (? = 'all' OR p.status = ?)
     ORDER BY c.name, c.id`
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
  const meta = { schemaVersion: 1, hash: await md5Hex(JSON.stringify(circles)) };
  if (c.req.query("metadata") === "1") return c.json({ meta });
  return c.json({ circles, meta });
});

app.get("/circles/:slug", async (c) => {
  const slug = c.req.param("slug");
  const eventSlug = c.req.query("event");

  let eventId: number | null = null;
  if (eventSlug) {
    const row = await c.env.DB.prepare("SELECT id FROM events WHERE slug = ?").bind(eventSlug).first<{ id: number }>();
    eventId = row?.id ?? null;
  } else {
    const today = new Date().toISOString().slice(0, 10);
    const row = await c.env.DB.prepare(
      "SELECT id FROM events WHERE ((start_date IS NULL AND end_date IS NULL AND status = 'active') OR ((start_date IS NULL OR start_date <= ?) AND (end_date IS NULL OR end_date >= ?))) ORDER BY start_date DESC LIMIT 1",
    ).bind(today, today).first<{ id: number }>();
    eventId = row?.id ?? null;
  }
  if (eventId === null) return c.json({ error: "event not found", code: "not_found" }, 404);

  const row = await c.env.DB.prepare(
    `SELECT c.id as circle_id, c.slug, c.name, p.id as participation_id,
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
        `INSERT INTO participations (circle_id, event_id, booth, day, booth_url, highlight, badge, note, status)
         VALUES (${CIRCLE_ID_SUBQ}, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 'confirmed'))
         ON CONFLICT(circle_id, event_id) DO UPDATE SET
           booth=excluded.booth, day=excluded.day, booth_url=excluded.booth_url, highlight=excluded.highlight,
           badge=excluded.badge, note=excluded.note, status=COALESCE(?, participations.status),
           updated_at=datetime('now')`
      )
      .bind(eventId, slug, eventId, booth, day, boothUrl, highlight ? 1 : 0, badge, note, status, status)
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
