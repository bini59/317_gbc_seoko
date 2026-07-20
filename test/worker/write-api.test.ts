import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../../worker/app";
import { makeTestDB } from "../helpers/d1";

const TOKEN = "test-token";

async function call(env: any, method: string, path: string, body?: unknown, opts: { auth?: boolean; ct?: boolean } = {}) {
  const { auth = true, ct = true } = opts;
  const headers: Record<string, string> = {};
  if (ct) headers["content-type"] = "application/json";
  if (auth) headers.authorization = `Bearer ${TOKEN}`;
  const res = await app.fetch(
    new Request(`http://x${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }),
    env,
  );
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function count(env: any, table: string): Promise<number> {
  const r = await env.DB.prepare(`SELECT COUNT(*) as n FROM ${table}`).first();
  return Number(r.n);
}

describe("write API validation + atomicity", () => {
  let env: any;
  beforeEach(async () => {
    env = { DB: makeTestDB(), ADMIN_TOKEN: TOKEN };
    await call(env, "POST", "/api/events", { slug: "ev", title: "T", status: "active" });
  });

  it("rejects invalid slug with 4xx and no DB write", async () => {
    const before = await count(env, "circles");
    const r = await call(env, "POST", "/api/circles", { slug: "bad slug!", name: "n", event_slug: "ev" });
    expect(r.status).toBe(400);
    expect(r.json.code).toBe("invalid_request");
    expect(await count(env, "circles")).toBe(before);
  });

  it("rejects a bad URL in links before writing anything", async () => {
    const r = await call(env, "POST", "/api/circles", {
      slug: "c",
      name: "n",
      event_slug: "ev",
      links: [{ label: "ok", url: "not-a-url" }],
    });
    expect(r.status).toBe(400);
    expect(await count(env, "circles")).toBe(0);
    expect(await count(env, "links")).toBe(0);
  });

  it("rejects invalid JSON body with a consistent 4xx", async () => {
    const res = await app.fetch(
      new Request("http://x/api/circles", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
        body: "{not json",
      }),
      env,
    );
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("invalid_request");
  });

  it("rejects wrong content-type with 4xx", async () => {
    const r = await call(env, "POST", "/api/circles", { slug: "c", name: "n", event_slug: "ev" }, { ct: false });
    expect(r.status).toBe(400);
  });

  it("upserts multiple tables in one batch", async () => {
    const ok = await call(env, "POST", "/api/circles", {
      slug: "c",
      name: "n",
      event_slug: "ev",
      ips: ["A", "B"],
      links: [{ label: "L", url: "https://x.com/a" }],
      tweetInfo: { url: "https://x.com/a/1" },
    });
    expect(ok.status).toBe(201);
    expect(await count(env, "links")).toBe(1);
    expect(await count(env, "circle_ips")).toBe(2);
    expect(await count(env, "tweet_infos")).toBe(1);
  });

  it("batch is atomic — a failing statement rolls back earlier writes", async () => {
    const before = await count(env, "circles");
    await expect(
      env.DB.batch([
        env.DB.prepare("INSERT INTO circles (event_id, slug, name) VALUES (1, 'rollback-me', 'x')"),
        // FK violation: no such participation → whole batch must roll back
        env.DB.prepare("INSERT INTO links (participation_id, label, url) VALUES (999999, 'l', 'u')"),
      ]),
    ).rejects.toThrow();
    expect(await count(env, "circles")).toBe(before);
  });

  it("a corrupted genre_tags JSON does not 500 the list", async () => {
    await call(env, "POST", "/api/circles", { slug: "c", name: "n", event_slug: "ev" });
    // corrupt the stored JSON directly
    await env.DB.prepare("UPDATE participations SET genre_tags = ? WHERE 1=1").bind("{broken").run();
    const list = await call(env, "GET", "/api/circles?event=ev&status=all");
    expect(list.status).toBe(200);
    expect(list.json.circles[0].genres).toEqual([]);
  });

  it("patch/delete on a missing participation return 404", async () => {
    expect((await call(env, "PATCH", "/api/participations/999", { booth: "X" })).status).toBe(404);
    expect((await call(env, "DELETE", "/api/participations/999")).status).toBe(404);
  });

  it("patch rejects an invalid status enum", async () => {
    await call(env, "POST", "/api/circles", { slug: "c", name: "n", event_slug: "ev" });
    const pid = (await env.DB.prepare("SELECT id FROM participations LIMIT 1").first()).id;
    const r = await call(env, "PATCH", `/api/participations/${pid}`, { status: "bogus" });
    expect(r.status).toBe(400);
  });

  it("rejects a participation whose event differs from its circle event", async () => {
    await call(env, "POST", "/api/events", { slug: "other", title: "다른 행사", status: "upcoming" });
    await call(env, "POST", "/api/circles", { slug: "c", name: "n", event_slug: "ev" });
    const circle = await env.DB.prepare("SELECT id FROM circles WHERE slug = 'c'").first();
    const other = await env.DB.prepare("SELECT id FROM events WHERE slug = 'other'").first();

    await expect(
      env.DB.prepare("INSERT INTO participations (circle_id, event_id) VALUES (?, ?)").bind(circle.id, other.id).run(),
    ).rejects.toThrow();
  });
});
