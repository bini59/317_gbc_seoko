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
});
