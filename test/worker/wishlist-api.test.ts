import { describe, it, expect, beforeEach, vi } from "vitest";
import { app } from "../../worker/app";
import { makeTestDB } from "../helpers/d1";

const TOKEN = "test-token";

describe("wishlist API", () => {
  let env: any;
  let circleIds: Record<string, number>;

  beforeEach(async () => {
    circleIds = {};
    env = {
      DB: makeTestDB(),
      ADMIN_TOKEN: TOKEN,
      AUTH_ORIGIN: "https://auth.bini59.dev",
      AUTH_CLIENT_ID: "seoko-maps",
      AUTH_CLIENT_SECRET: "secret",
    };
    await app.fetch(
      new Request("http://x/api/events", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({ slug: "ev1", title: "Event 1", status: "active" }),
      }),
      env,
      {} as ExecutionContext,
    );
    await app.fetch(
      new Request("http://x/api/events", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({ slug: "ev2", title: "Event 2", status: "upcoming" }),
      }),
      env,
      {} as ExecutionContext,
    );
    for (const slug of ["c1", "c2", "c3"]) {
      await app.fetch(
        new Request("http://x/api/circles", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
          body: JSON.stringify({ slug, name: slug, event_slug: "ev1" }),
        }),
        env,
        {} as ExecutionContext,
      );
      const circle = await env.DB.prepare("SELECT id FROM circles WHERE slug = ? AND event_id = (SELECT id FROM events WHERE slug = 'ev1')").bind(slug).first<{ id: number }>();
      circleIds[slug] = circle.id;
    }
  });

  it("requires authentication for wishlist endpoints", async () => {
    const getRes = await app.fetch(new Request("http://x/api/wishlist"), env, {} as ExecutionContext);
    expect(getRes.status).toBe(401);

    const putRes = await app.fetch(
      new Request("http://x/api/wishlist", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ events: ["ev1"] }),
      }),
      env,
      {} as ExecutionContext,
    );
    expect(putRes.status).toBe(401);
  });

  it("saves and retrieves event wishlist", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ userId: "u1" }), { status: 200 }),
    );

    const initialGet = await app.fetch(
      new Request("http://x/api/wishlist", { headers: { cookie: "sid=s1" } }),
      env,
      {} as ExecutionContext,
    );
    expect(initialGet.status).toBe(200);
    expect(await initialGet.json()).toEqual({ events: [], updatedAt: null });

    const putRes = await app.fetch(
      new Request("http://x/api/wishlist", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=s1" },
        body: JSON.stringify({ events: ["ev1"] }),
      }),
      env,
      {} as ExecutionContext,
    );
    expect(putRes.status).toBe(200);
    const putJson = await putRes.json() as any;
    expect(putJson.saved).toBe(true);
    expect(putJson.events).toEqual(["ev1"]);
    expect(putJson.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const getRes = await app.fetch(
      new Request("http://x/api/wishlist", { headers: { cookie: "sid=s1" } }),
      env,
      {} as ExecutionContext,
    );
    expect(await getRes.json()).toEqual({ events: ["ev1"], updatedAt: putJson.updatedAt });
  });

  it("rejects unknown event slug in event wishlist", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ userId: "u1" }), { status: 200 }),
    );

    const putRes = await app.fetch(
      new Request("http://x/api/wishlist", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=s1" },
        body: JSON.stringify({ events: ["non-existent"] }),
      }),
      env,
      {} as ExecutionContext,
    );
    expect(putRes.status).toBe(400);
    const json = await putRes.json() as any;
    expect(json.code).toBe("invalid_request");
  });

  it("returns actual server state on stale and clock skew for event wishlist", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ userId: "u1" }), { status: 200 }),
    );

    const firstPut = await app.fetch(
      new Request("http://x/api/wishlist", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=s1" },
        body: JSON.stringify({ events: ["ev1"] }),
      }),
      env,
      {} as ExecutionContext,
    );
    const firstJson = await firstPut.json() as any;

    const stalePut = await app.fetch(
      new Request("http://x/api/wishlist", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=s1" },
        body: JSON.stringify({ events: ["ev2"], updatedAt: new Date(Date.parse(firstJson.updatedAt) - 1000).toISOString() }),
      }),
      env,
      {} as ExecutionContext,
    );
    expect(stalePut.status).toBe(200);
    expect(await stalePut.json()).toEqual({
      events: ["ev1"],
      updatedAt: firstJson.updatedAt,
      saved: false,
      conflict: "stale",
    });

    const skewedPut = await app.fetch(
      new Request("http://x/api/wishlist", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=s1" },
        body: JSON.stringify({ events: ["ev2"], updatedAt: "2099-01-01T00:00:00.000Z" }),
      }),
      env,
      {} as ExecutionContext,
    );
    expect(skewedPut.status).toBe(200);
    expect(await skewedPut.json()).toEqual({
      events: ["ev1"],
      updatedAt: firstJson.updatedAt,
      saved: false,
      conflict: "clock_skew",
    });
  });

  it("rejects a stale replacement after a newer replacement wins its CAS", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ userId: "u1" }), { status: 200 }),
    );

    const firstPut = await app.fetch(
      new Request("http://x/api/wishlist", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=s1" },
        body: JSON.stringify({ events: ["ev1"] }),
      }),
      env,
      {} as ExecutionContext,
    );
    const firstJson = await firstPut.json() as any;
    const replacementAt = new Date(Date.parse(firstJson.updatedAt) + 1000).toISOString();
    const replacementPut = await app.fetch(
      new Request("http://x/api/wishlist", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=s1" },
        body: JSON.stringify({ events: ["ev2"], updatedAt: replacementAt }),
      }),
      env,
      {} as ExecutionContext,
    );
    expect((await replacementPut.json() as any).saved).toBe(true);

    const stalePut = await app.fetch(
      new Request("http://x/api/wishlist", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=s1" },
        body: JSON.stringify({ events: ["ev1"], updatedAt: firstJson.updatedAt }),
      }),
      env,
      {} as ExecutionContext,
    );
    expect(await stalePut.json()).toEqual({
      events: ["ev2"],
      updatedAt: replacementAt,
      saved: false,
      conflict: "stale",
    });
  });

  it("persists an updatedAt tombstone when the event wishlist is cleared", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ userId: "u1" }), { status: 200 }),
    );

    const firstPut = await app.fetch(
      new Request("http://x/api/wishlist", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=s1" },
        body: JSON.stringify({ events: ["ev1"] }),
      }),
      env,
      {} as ExecutionContext,
    );
    const firstJson = await firstPut.json() as any;

    const clearPut = await app.fetch(
      new Request("http://x/api/wishlist", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=s1" },
        body: JSON.stringify({ events: [], updatedAt: new Date(Date.parse(firstJson.updatedAt) + 1000).toISOString() }),
      }),
      env,
      {} as ExecutionContext,
    );
    const clearJson = await clearPut.json() as any;
    expect(clearJson).toMatchObject({ events: [], saved: true });
    expect(Date.parse(clearJson.updatedAt)).toBeGreaterThan(Date.parse(firstJson.updatedAt));

    const getRes = await app.fetch(
      new Request("http://x/api/wishlist", { headers: { cookie: "sid=s1" } }),
      env,
      {} as ExecutionContext,
    );
    expect(await getRes.json()).toEqual({ events: [], updatedAt: clearJson.updatedAt });
  });

  it("rejects a stale replacement after a newer replacement wins", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ userId: "u1" }), { status: 200 }),
    );

    const firstPut = await app.fetch(
      new Request("http://x/api/wishlist", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=s1" },
        body: JSON.stringify({ events: ["ev1"] }),
      }),
      env,
      {} as ExecutionContext,
    );
    const firstJson = await firstPut.json() as any;
    const newerAt = new Date(Date.parse(firstJson.updatedAt) + 1000).toISOString();

    const newerPut = await app.fetch(
      new Request("http://x/api/wishlist", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=s1" },
        body: JSON.stringify({ events: ["ev2"], updatedAt: newerAt }),
      }),
      env,
      {} as ExecutionContext,
    );
    expect((await newerPut.json() as any).saved).toBe(true);

    const stalePut = await app.fetch(
      new Request("http://x/api/wishlist", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=s1" },
        body: JSON.stringify({ events: ["ev1"], updatedAt: firstJson.updatedAt }),
      }),
      env,
      {} as ExecutionContext,
    );
    expect(await stalePut.json()).toEqual({
      events: ["ev2"],
      updatedAt: newerAt,
      saved: false,
      conflict: "stale",
    });
  });

  it("prunes unknown circle IDs and normalizes stored circle JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ userId: "u1" }), { status: 200 }),
    );
    await app.fetch(new Request("http://x/api/circles", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ slug: "known", name: "Known", event_slug: "ev1" }),
    }), env, {} as ExecutionContext);
    const putRes = await app.fetch(new Request("http://x/api/wishlist?event=ev1", {
      method: "PUT",
      headers: { "content-type": "application/json", cookie: "sid=s1" },
      body: JSON.stringify({ circles: { [String((await env.DB.prepare("SELECT id FROM circles WHERE slug = 'known'").first<{ id: number }>()).id)]: { star: true, memo: "  note  " }, deleted: { star: true } } }),
    }), env, {} as ExecutionContext);
const knownId = (await env.DB.prepare("SELECT id FROM circles WHERE slug = 'known'").first<{ id: number }>()).id;
     expect(await putRes.json()).toMatchObject({ circles: { [String(knownId)]: { star: true, memo: "note" } } });
     const row = await env.DB.prepare("SELECT circles FROM user_wishlist WHERE user_id = 'u1' AND event_slug = 'ev1'").first() as { circles: string };
     expect(row.circles).toBe(JSON.stringify({ [String(knownId)]: { star: true, memo: "note" } }));
  });

  it("saves and retrieves circle wishlist, clearing empty memo", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ userId: "u1" }), { status: 200 }),
    );

    const putRes = await app.fetch(
      new Request("http://x/api/wishlist?event=ev1", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=s1" },
        body: JSON.stringify({
          circles: {
            [String(circleIds.c1)]: { star: true, memo: "  remember this  " },
            [String(circleIds.c2)]: { star: false, memo: "   " },
            [String(circleIds.c3)]: { star: true, memo: "   " },
          },
        }),
      }),
      env,
      {} as ExecutionContext,
    );
    expect(putRes.status).toBe(200);
    const putJson = await putRes.json() as any;
    expect(putJson.saved).toBe(true);
    expect(putJson.circles).toEqual({
      [String(circleIds.c1)]: { star: true, memo: "remember this" },
      [String(circleIds.c3)]: { star: true },
    });
    expect(putJson.circles[String(circleIds.c2)]).toBeUndefined();

    const getRes = await app.fetch(
      new Request("http://x/api/wishlist?event=ev1", { headers: { cookie: "sid=s1" } }),
      env,
      {} as ExecutionContext,
    );
    expect(await getRes.json()).toEqual({
      circles: {
        [String(circleIds.c1)]: { star: true, memo: "remember this" },
        [String(circleIds.c3)]: { star: true },
      },
      updatedAt: putJson.updatedAt,
    });
  });

  it("returns actual server state on stale and clock skew for circle wishlist", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ userId: "u1" }), { status: 200 }),
    );

    const firstPut = await app.fetch(
      new Request("http://x/api/wishlist?event=ev1", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=s1" },
        body: JSON.stringify({ circles: { [String(circleIds.c1)]: { star: true } } }),
      }),
      env,
      {} as ExecutionContext,
    );
    const firstJson = await firstPut.json() as any;

    const stalePut = await app.fetch(
      new Request("http://x/api/wishlist?event=ev1", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=s1" },
        body: JSON.stringify({
          circles: { [String(circleIds.c2)]: { star: true } },
          updatedAt: new Date(Date.parse(firstJson.updatedAt) - 1000).toISOString(),
        }),
      }),
      env,
      {} as ExecutionContext,
    );
    expect(stalePut.status).toBe(200);
    expect(await stalePut.json()).toEqual({
      circles: { [String(circleIds.c1)]: { star: true } },
      updatedAt: firstJson.updatedAt,
      saved: false,
      conflict: "stale",
    });

    const skewedPut = await app.fetch(
      new Request("http://x/api/wishlist?event=ev1", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=s1" },
        body: JSON.stringify({ circles: { [String(circleIds.c2)]: { star: true } }, updatedAt: "2099-01-01T00:00:00.000Z" }),
      }),
      env,
      {} as ExecutionContext,
    );
    expect(skewedPut.status).toBe(200);
    expect(await skewedPut.json()).toEqual({
      circles: { [String(circleIds.c1)]: { star: true } },
      updatedAt: firstJson.updatedAt,
      saved: false,
      conflict: "clock_skew",
    });
  });

  it("keeps event timestamps and circle timestamps completely independent", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ userId: "u1" }), { status: 200 }),
    );

    const eventPut = await app.fetch(
      new Request("http://x/api/wishlist", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=s1" },
        body: JSON.stringify({ events: ["ev1"] }),
      }),
      env,
      {} as ExecutionContext,
    );
    const eventJson = await eventPut.json() as any;
    expect(eventJson.saved).toBe(true);

    const circlePut = await app.fetch(
      new Request("http://x/api/wishlist?event=ev1", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=s1" },
        body: JSON.stringify({ circles: { [String(circleIds.c1)]: { star: true, memo: "test" } } }),
      }),
      env,
      {} as ExecutionContext,
    );
    const circleJson = await circlePut.json() as any;
    expect(circleJson.saved).toBe(true);

    const eventGet = await app.fetch(
      new Request("http://x/api/wishlist", { headers: { cookie: "sid=s1" } }),
      env,
      {} as ExecutionContext,
    );
    const eventGetJson = await eventGet.json() as any;
    expect(eventGetJson.events).toEqual(["ev1"]);
    expect(eventGetJson.updatedAt).toBe(eventJson.updatedAt);

    const eventPut2 = await app.fetch(
      new Request("http://x/api/wishlist", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=s1" },
        body: JSON.stringify({
          events: ["ev1", "ev2"],
          updatedAt: new Date(Date.parse(eventJson.updatedAt) + 1000).toISOString(),
        }),
      }),
      env,
      {} as ExecutionContext,
    );
    const eventPut2Json = await eventPut2.json() as any;
    expect(eventPut2Json.saved).toBe(true);

    const circleGet = await app.fetch(
      new Request("http://x/api/wishlist?event=ev1", { headers: { cookie: "sid=s1" } }),
      env,
      {} as ExecutionContext,
    );
    const circleGetJson = await circleGet.json() as any;
    expect(circleGetJson.circles).toEqual({ [String(circleIds.c1)]: { star: true, memo: "test" } });
    expect(circleGetJson.updatedAt).toBe(circleJson.updatedAt);
  });

  it("rejects memo exceeding 500 characters and disallowed fields", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ userId: "u1" }), { status: 200 }),
    );

    const tooLong = await app.fetch(
      new Request("http://x/api/wishlist?event=ev1", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=s1" },
        body: JSON.stringify({ circles: { [String(circleIds.c1)]: { memo: "a".repeat(501) } } }),
      }),
      env,
      {} as ExecutionContext,
    );
    expect(tooLong.status).toBe(400);

    const badField = await app.fetch(
      new Request("http://x/api/wishlist?event=ev1", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: "sid=s1" },
        body: JSON.stringify({ circles: { [String(circleIds.c1)]: { malicious: "hack" } } }),
      }),
      env,
      {} as ExecutionContext,
    );
    expect(badField.status).toBe(400);
  });
});
