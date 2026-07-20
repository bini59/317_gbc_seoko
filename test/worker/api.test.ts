import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../../worker/app";
import { makeTestDB } from "../helpers/d1";

const TOKEN = "test-token";

function makeEnv() {
  return { DB: makeTestDB(), ADMIN_TOKEN: TOKEN };
}

async function call(env: any, method: string, path: string, body?: unknown, auth = true) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (auth) headers.authorization = `Bearer ${TOKEN}`;
  const res = await app.fetch(
    new Request(`http://x${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );
  return { status: res.status, json: await res.json().catch(() => null) };
}

describe("worker API", () => {
  let env: any;
  beforeEach(() => {
    env = makeEnv();
  });

  it("rejects mutations without a valid bearer token", async () => {
    const r = await call(env, "POST", "/api/events", { slug: "e", title: "t" }, false);
    expect(r.status).toBe(401);
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

  it("upserts a circle and serializes it in list + detail", async () => {
    await call(env, "POST", "/api/events", { slug: "ev", title: "T", status: "active" });
    const up = await call(env, "POST", "/api/circles", {
      slug: "circ",
      name: "서클",
      event_slug: "ev",
      genre_label: "걸밴크",
      genre_tags: ["걸밴크", "오리지널"],
      booth: "A-01",
      highlight: true,
      ips: ["걸즈밴드크라이"],
      links: [{ kind: "x", label: "X", url: "https://x.com/a" }],
      tweetInfo: { url: "https://x.com/a/status/1", ogTitle: "t" },
    });
    expect(up.status).toBe(201);

    const list = await call(env, "GET", "/api/circles?event=ev");
    expect(list.status).toBe(200);
    const c = list.json.circles[0];
    expect(c.slug).toBe("circ");
    expect(c.genres).toEqual(["걸밴크", "오리지널"]);
    expect(c.ips).toEqual(["걸즈밴드크라이"]);
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
