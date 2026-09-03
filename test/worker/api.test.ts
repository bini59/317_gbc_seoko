import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { app, determineEventStatus } from "../../worker/app";
import { makeTestDB } from "../helpers/d1";

const TOKEN = "test-token";

function makeEnv() {
  return { DB: makeTestDB(), ADMIN_TOKEN: TOKEN };
}

async function call(env: any, method: string, path: string, body?: unknown, auth = true) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (auth) headers.authorization = `Bearer ${TOKEN}`;
  const backgroundTasks: Promise<unknown>[] = [];
  const res = await app.fetch(
    new Request(`http://x${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
    { waitUntil: (task: Promise<unknown>) => backgroundTasks.push(task) } as ExecutionContext,
  );
  await Promise.all(backgroundTasks);
  return { status: res.status, json: await res.json().catch(() => null) };
}

describe("worker API", () => {
  let env: any;
  beforeEach(() => {
    env = makeEnv();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("rejects mutations without a valid bearer token", async () => {
    const r = await call(env, "POST", "/api/events", { slug: "e", title: "t" }, false);
    expect(r.status).toBe(401);
  });

  it("accepts public feedback without a token and stores it", async () => {
    const r = await call(env, "POST", "/api/feedback", { message: "  지도가 안 열려요 ", contact: "@me" }, false);
    expect(r.status).toBe(201);
    const bad = await call(env, "POST", "/api/feedback", { message: "" }, false);
    expect(bad.status).toBe(400);
    const row = await env.DB.prepare("SELECT message, contact, user_id FROM feedback").first();
    expect(row).toMatchObject({ message: "지도가 안 열려요", contact: "@me", user_id: null });
  });

  it("forwards feedback by email when the binding is configured", async () => {
    const send = vi.fn(async () => ({}));
    const r = await call({ ...env, EMAIL: { send }, FEEDBACK_TO: "contact@bini59.dev" }, "POST", "/api/feedback", { message: "안녕" }, false);
    expect(r.status).toBe(201);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: "contact@bini59.dev", subject: "[seoko-maps 피드백] 안녕" }));
  });

  it("returns disabled auth when 321_auth is not configured", async () => {
    const r = await call(env, "GET", "/api/auth/me");
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ enabled: false, user: null });
  });

  it("verifies the optional 321_auth session and syncs checks per user", async () => {
    const authFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ userId: "user-1", email: "user@example.com", name: "User", avatarUrl: null, membership: null }), { status: 200 }),
    );
    const authEnv = { ...env, AUTH_ORIGIN: "https://auth.bini59.dev", AUTH_CLIENT_ID: "seoko-maps", AUTH_CLIENT_SECRET: "secret" };
    const r = await app.fetch(
      new Request("http://x/api/auth/me", { headers: { cookie: "sid=session" } }),
      authEnv,
      {} as ExecutionContext,
    );
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ enabled: true, user: { userId: "user-1" } });
    expect(authFetch).toHaveBeenCalledWith(
      "https://auth.bini59.dev/verify?client_id=seoko-maps",
      { headers: { "x-app-secret": "secret", cookie: "sid=session" } },
    );

    const saved = await app.fetch(
      new Request("http://x/api/checks?event=ev", { method: "PUT", headers: { "content-type": "application/json", cookie: "sid=session" }, body: JSON.stringify({ checks: { booth: true } }) }),
      authEnv,
      {} as ExecutionContext,
    );
    expect(saved.status).toBe(200);
    const loaded = await app.fetch(
      new Request("http://x/api/checks?event=ev", { headers: { cookie: "sid=session" } }),
      authEnv,
      {} as ExecutionContext,
    );
    expect(await loaded.json()).toMatchObject({ checks: { booth: true }, updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) });
  });

  it("returns updatedAt and rejects stale, equal, and badly skewed check writes", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ userId: "user-1", email: null, name: null, avatarUrl: null, membership: null }), { status: 200 }),
    );
    const authEnv = { ...env, AUTH_ORIGIN: "https://auth.bini59.dev", AUTH_CLIENT_ID: "seoko-maps", AUTH_CLIENT_SECRET: "secret" };
    const request = (updatedAt: string | null, checks: Record<string, boolean>) => app.fetch(
      new Request("http://x/api/checks?event=ev", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=session" },
        body: JSON.stringify({ checks, ...(updatedAt === null ? {} : { updatedAt }) }),
      }),
      authEnv,
      {} as ExecutionContext,
    );

    const first = await request(new Date(Date.now() - 2_000).toISOString(), { first: true });
    expect(first.status).toBe(200);
    const firstJson = await first.json() as { updatedAt: string };
    expect(firstJson).toMatchObject({ checks: { first: true }, saved: true });
    expect(firstJson.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    const stale = await request(new Date(Date.parse(firstJson.updatedAt) - 1).toISOString(), { stale: true });
    expect(await stale.json()).toEqual({ checks: { first: true }, updatedAt: firstJson.updatedAt, saved: false, conflict: "stale" });

    const equal = await request(firstJson.updatedAt, { equal: true });
    expect(await equal.json()).toEqual({ checks: { first: true }, updatedAt: firstJson.updatedAt, saved: false, conflict: "stale" });

    const skewed = await request("2099-01-01T00:00:00.000Z", { future: true });
    expect(await skewed.json()).toEqual({ checks: { first: true }, updatedAt: firstJson.updatedAt, saved: false, conflict: "clock_skew" });

    const invalid = await request(null, { invalid: "true" } as unknown as Record<string, boolean>);
    expect(invalid.status).toBe(400);

    const csrf = await app.fetch(
      new Request("http://x/api/checks?event=ev", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=session", origin: "https://evil.example" },
        body: JSON.stringify({ checks: { csrf: true } }),
      }),
      authEnv,
      {} as ExecutionContext,
    );
    expect(csrf.status).toBe(403);
  });

  it("logs out via server-side POST to 321_auth and clears the sid cookie (#34)", async () => {
    const authFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 302 }));
    const authEnv = { ...env, AUTH_ORIGIN: "https://auth.bini59.dev", AUTH_CLIENT_ID: "seoko-maps", AUTH_CLIENT_SECRET: "secret" };
    const r = await app.fetch(
      new Request("http://x/api/auth/logout", { method: "POST", headers: { cookie: "sid=session; other=1" } }),
      authEnv,
      {} as ExecutionContext,
    );
    expect(r.status).toBe(200);
    const [url, init] = authFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://auth.bini59.dev/logout?client_id=seoko-maps");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.cookie).toBe(`sid=session; csrf=${headers["x-csrf-token"]}`);
    expect(headers["x-csrf-token"]).toBeTruthy();
    const cookies = r.headers.getSetCookie();
    expect(cookies.some((c) => c.startsWith("sid=;") && c.includes("Max-Age=0") && !c.includes("Domain="))).toBe(true);
    expect(cookies.some((c) => c.startsWith("sid=;") && c.includes("Domain=bini59.dev"))).toBe(true);
    expect(await r.json()).toEqual({ ok: true, revoked: true });
  });

  it("still clears the local sid cookie when 321_auth revoke fails (#34)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("down"));
    const authEnv = { ...env, AUTH_ORIGIN: "https://auth.bini59.dev", AUTH_CLIENT_ID: "seoko-maps", AUTH_CLIENT_SECRET: "secret" };
    const r = await app.fetch(
      new Request("http://x/api/auth/logout", { method: "POST", headers: { cookie: "sid=session" } }),
      authEnv,
      {} as ExecutionContext,
    );
    expect(r.status).toBe(200);
    expect(r.headers.getSetCookie().some((c) => c.startsWith("sid=;") && c.includes("Max-Age=0"))).toBe(true);
  });

  it("reports revoked=false when 321_auth rejects the logout (#34)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 403 }));
    const authEnv = { ...env, AUTH_ORIGIN: "https://auth.bini59.dev", AUTH_CLIENT_ID: "seoko-maps", AUTH_CLIENT_SECRET: "secret" };
    const r = await app.fetch(
      new Request("http://x/api/auth/logout", { method: "POST", headers: { cookie: "sid=session" } }),
      authEnv,
      {} as ExecutionContext,
    );
    expect(await r.json()).toEqual({ ok: true, revoked: false });
  });

  it("skips the upstream call without a sid cookie but still clears it (#34)", async () => {
    const authFetch = vi.spyOn(globalThis, "fetch");
    const authEnv = { ...env, AUTH_ORIGIN: "https://auth.bini59.dev", AUTH_CLIENT_ID: "seoko-maps", AUTH_CLIENT_SECRET: "secret" };
    const r = await app.fetch(new Request("http://x/api/auth/logout", { method: "POST" }), authEnv, {} as ExecutionContext);
    expect(r.status).toBe(200);
    expect(authFetch).not.toHaveBeenCalled();
    expect(r.headers.getSetCookie().some((c) => c.startsWith("sid=;"))).toBe(true);
  });

  it("rejects cross-site logout requests (#34)", async () => {
    const authFetch = vi.spyOn(globalThis, "fetch");
    for (const headers of [{ "sec-fetch-site": "cross-site", cookie: "sid=s" }, { origin: "https://evil.example", cookie: "sid=s" }]) {
      const r = await app.fetch(new Request("http://x/api/auth/logout", { method: "POST", headers }), env, {} as ExecutionContext);
      expect(r.status).toBe(403);
    }
    expect(authFetch).not.toHaveBeenCalled();
    const ok = await app.fetch(
      new Request("http://x/api/auth/logout", { method: "POST", headers: { "sec-fetch-site": "same-origin", origin: "http://x" } }),
      env,
      {} as ExecutionContext,
    );
    expect(ok.status).toBe(200);
  });

  it("creates an event and lists it", async () => {
    const created = await call(env, "POST", "/api/events", {
      slug: "cw-2026-07",
      title: "코믹월드",
      status: "active",
    });
    expect(created.status).toBe(201);
    const list = await call(env, "GET", "/api/events");
    expect(list.status).toBe(200);
    expect(list.json.events.map((e: any) => e.slug)).toContain("cw-2026-07");
  });

  it("provides stable MD5 metadata without returning event data", async () => {
    await call(env, "POST", "/api/events", { slug: "ev", title: "T", status: "active" });
    const first = await call(env, "GET", "/api/events?metadata=1");
    expect(first.status).toBe(200);
    expect(first.json).toMatchObject({ meta: { schemaVersion: 1, hash: expect.stringMatching(/^[a-f0-9]{32}$/) } });
    expect(first.json).not.toHaveProperty("events");

    const second = await call(env, "GET", "/api/events?metadata=1");
    expect(second.json.meta.hash).toBe(first.json.meta.hash);
    const full = await call(env, "GET", "/api/events");
    expect(full.json.meta).toEqual(first.json.meta);
  });

  it("changes circle metadata when event data changes and keeps it event-scoped", async () => {
    await call(env, "POST", "/api/events", { slug: "a", title: "A", status: "active" });
    await call(env, "POST", "/api/events", { slug: "b", title: "B", status: "upcoming" });
    await call(env, "POST", "/api/circles", { slug: "same", name: "A 서클", event_slug: "a" });
    await call(env, "POST", "/api/circles", { slug: "same", name: "B 서클", event_slug: "b" });

    const a = await call(env, "GET", "/api/circles?event=a&status=all&metadata=1");
    const b = await call(env, "GET", "/api/circles?event=b&status=all&metadata=1");
    expect(a.json).toMatchObject({ meta: { schemaVersion: 1, hash: expect.stringMatching(/^[a-f0-9]{32}$/) } });
    expect(b.json.meta.hash).not.toBe(a.json.meta.hash);

    await call(env, "POST", "/api/circles", { slug: "new", name: "새 서클", event_slug: "a" });
    const changedA = await call(env, "GET", "/api/circles?event=a&status=all&metadata=1");
    const unchangedB = await call(env, "GET", "/api/circles?event=b&status=all&metadata=1");
    expect(changedA.json.meta.hash).not.toBe(a.json.meta.hash);
    expect(unchangedB.json.meta.hash).toBe(b.json.meta.hash);
  });

  it("determines event status with inclusive event dates", () => {
    expect(determineEventStatus({ start_date: "2026-09-02", end_date: "2026-09-03", status: "past" }, "2026-09-01")).toBe("upcoming");
    expect(determineEventStatus({ start_date: "2026-09-02", end_date: "2026-09-03", status: "past" }, "2026-09-02")).toBe("active");
    expect(determineEventStatus({ start_date: "2026-09-02", end_date: "2026-09-03", status: "past" }, "2026-09-03")).toBe("active");
    expect(determineEventStatus({ start_date: "2026-09-02", end_date: "2026-09-03", status: "upcoming" }, "2026-09-04")).toBe("past");
    expect(determineEventStatus({ start_date: null, end_date: null, status: "upcoming" }, "2026-09-01")).toBe("upcoming");
  });

  it("rejects invalid or reversed event dates", async () => {
    expect((await call(env, "POST", "/api/events", {
      slug: "invalid-date",
      title: "잘못된 날짜",
      start_date: "2026-9-2",
    })).status).toBe(400);
    expect((await call(env, "POST", "/api/events", {
      slug: "reversed-date",
      title: "뒤집힌 날짜",
      start_date: "2026-09-03",
      end_date: "2026-09-02",
    })).status).toBe(400);
  });

  it("uses date-derived activity for implicit circle lookups", async () => {
    vi.useFakeTimers({ now: new Date("2026-09-02T12:00:00Z"), toFake: ["Date"] });
    await call(env, "POST", "/api/events", {
      slug: "current-event",
      title: "현재 행사",
      start_date: "2026-09-01",
      end_date: "2026-09-02",
      status: "past",
    });
    await call(env, "POST", "/api/circles", { slug: "circle", name: "서클", event_slug: "current-event" });

    const list = await call(env, "GET", "/api/circles");
    expect(list.json.circles).toHaveLength(1);
    const detail = await call(env, "GET", "/api/circles/circle");
    expect(detail.json.circle.name).toBe("서클");
  });

  it("refreshes event status from dates in the background after listing events", async () => {
    await call(env, "POST", "/api/events", {
      slug: "upcoming-event",
      title: "예정 행사",
      start_date: "2999-09-02",
      end_date: "2999-09-03",
      status: "past",
    });
    const list = await call(env, "GET", "/api/events");
    expect(list.json.events[0]).toMatchObject({ slug: "upcoming-event", status: "upcoming" });
  });

  it("upserts a circle and serializes it in list + detail", async () => {
    await call(env, "POST", "/api/events", { slug: "ev", title: "T", status: "active" });
    const up = await call(env, "POST", "/api/circles", {
      slug: "circ",
      name: "서클",
      event_slug: "ev",
      booth: "A-01",
      highlight: true,
      ips: ["걸밴크", "오리지널", "걸즈밴드크라이"],
      links: [{ kind: "x", label: "X", url: "https://x.com/a" }],
      tweetInfo: { url: "https://x.com/a/status/1", ogTitle: "t" },
    });
    expect(up.status).toBe(201);

    const list = await call(env, "GET", "/api/circles?event=ev");
    expect(list.status).toBe(200);
    const c = list.json.circles[0];
    expect(c.slug).toBe("circ");
    expect(c.ips).toEqual(["걸밴크", "오리지널", "걸즈밴드크라이"]);
    expect(c).not.toHaveProperty("genre");
    expect(c).not.toHaveProperty("genres");
    expect(c.highlight).toBe(true);
    expect(c.links).toHaveLength(1);
    expect(c.tweetInfo.ogTitle).toBe("t");

    const detail = await call(env, "GET", "/api/circles/circ?event=ev");
    expect(detail.json.circle.name).toBe("서클");
  });

  it("hides unlisted circles by default and reveals them with status=all", async () => {
    await call(env, "POST", "/api/events", { slug: "ev", title: "T", status: "active" });
    await call(env, "POST", "/api/circles", { slug: "conf", name: "C", event_slug: "ev", status: "confirmed" });
    await call(env, "POST", "/api/circles", { slug: "unl", name: "U", event_slug: "ev", status: "unlisted" });

    const def = await call(env, "GET", "/api/circles?event=ev");
    expect(def.json.circles.map((c: any) => c.slug)).toEqual(["conf"]);

    const all = await call(env, "GET", "/api/circles?event=ev&status=all");
    expect(all.json.circles.map((c: any) => c.slug).sort()).toEqual(["conf", "unl"]);
  });

  it("re-upsert updates the existing participation instead of duplicating", async () => {
    await call(env, "POST", "/api/events", { slug: "ev", title: "T", status: "active" });
    await call(env, "POST", "/api/circles", { slug: "c", name: "N1", event_slug: "ev" });
    await call(env, "POST", "/api/circles", { slug: "c", name: "N2", event_slug: "ev", booth: "B-02" });
    const list = await call(env, "GET", "/api/circles?event=ev&status=all");
    expect(list.json.circles).toHaveLength(1);
    expect(list.json.circles[0].name).toBe("N2");
    expect(list.json.circles[0].booth).toBe("B-02");
  });

  it("keeps circles with the same slug independent across events", async () => {
    await call(env, "POST", "/api/events", { slug: "event-a", title: "행사 A", status: "active" });
    await call(env, "POST", "/api/events", { slug: "event-b", title: "행사 B", status: "upcoming" });

    const eventA = await call(env, "POST", "/api/circles", {
      slug: "same-circle",
      name: "행사 A 서클",
      event_slug: "event-a",
      links: [{ label: "A 링크", url: "https://example.com/a" }],
      tweetInfo: { url: "https://x.com/a/status/1", ogTitle: "A 트윗" },
    });
    const eventB = await call(env, "POST", "/api/circles", {
      slug: "same-circle",
      name: "행사 B 서클",
      event_slug: "event-b",
      links: [{ label: "B 링크", url: "https://example.com/b" }],
      tweetInfo: { url: "https://x.com/b/status/2", ogTitle: "B 트윗" },
    });

    expect(eventA.status).toBe(201);
    expect(eventB.status).toBe(201);
    expect(eventA.json.circleId).not.toBe(eventB.json.circleId);

    const detailA = await call(env, "GET", "/api/circles/same-circle?event=event-a");
    const detailB = await call(env, "GET", "/api/circles/same-circle?event=event-b");
    expect(detailA.json.circle).toMatchObject({
      name: "행사 A 서클",
      links: [{ label: "A 링크", url: "https://example.com/a" }],
      tweetInfo: { ogTitle: "A 트윗" },
    });
    expect(detailB.json.circle).toMatchObject({
      name: "행사 B 서클",
      links: [{ label: "B 링크", url: "https://example.com/b" }],
      tweetInfo: { ogTitle: "B 트윗" },
    });

    await call(env, "POST", "/api/circles/same-circle/links", {
      event_slug: "event-b",
      label: "B 추가 링크",
      url: "https://example.com/b-extra",
    });
    await call(env, "POST", "/api/circles/same-circle/tweet-info", {
      event_slug: "event-b",
      url: "https://x.com/b/status/3",
      ogTitle: "B 수정 트윗",
    });
    await call(env, "POST", "/api/verifications", {
      circle_slug: "same-circle",
      event_slug: "event-a",
      source: "official",
      result: "confirmed",
    });
    await call(env, "POST", "/api/verifications", {
      circle_slug: "same-circle",
      event_slug: "event-b",
      source: "catalog",
      result: "confirmed",
    });

    const updatedA = await call(env, "GET", "/api/circles/same-circle?event=event-a");
    const updatedB = await call(env, "GET", "/api/circles/same-circle?event=event-b");
    expect(updatedA.json.circle.links).toHaveLength(1);
    expect(updatedA.json.circle.tweetInfo.ogTitle).toBe("A 트윗");
    expect(updatedB.json.circle.links.map((link: any) => link.label)).toEqual(["B 링크", "B 추가 링크"]);
    expect(updatedB.json.circle.tweetInfo.ogTitle).toBe("B 수정 트윗");

    const verifications = await call(env, "GET", "/api/verifications?circle=same-circle&event=event-b");
    expect(verifications.json.verifications).toHaveLength(1);
    expect(verifications.json.verifications[0]).toMatchObject({ source: "catalog", circle_slug: "same-circle" });
  });

  it("returns legacy verification logs without an event when no event filter is used", async () => {
    await call(env, "POST", "/api/events", { slug: "ev", title: "행사", status: "active" });
    const created = await call(env, "POST", "/api/circles", { slug: "circle", name: "서클", event_slug: "ev" });
    await env.DB.prepare(
      "INSERT INTO verification_log (circle_id, participation_id, event_id, source, result) VALUES (?, ?, NULL, 'legacy', 'confirmed')",
    ).bind(created.json.circleId, created.json.participationId).run();

    const all = await call(env, "GET", "/api/verifications?circle=circle");
    expect(all.json.verifications).toHaveLength(1);
    expect(all.json.verifications[0]).toMatchObject({ source: "legacy", event_id: null });

    const scoped = await call(env, "GET", "/api/verifications?circle=circle&event=ev");
    expect(scoped.json.verifications).toHaveLength(0);
  });
});
