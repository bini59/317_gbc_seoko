import { afterEach, describe, expect, it, vi } from "vitest";
import { syncDeletions } from "../../worker/deletions";
import { makeTestDB } from "../helpers/d1";

const env = () => ({
  DB: makeTestDB(),
  ADMIN_TOKEN: "t",
  AUTH_ORIGIN: "https://auth.bini59.dev",
  AUTH_CLIENT_ID: "seoko-maps",
  AUTH_CLIENT_SECRET: "secret",
});

async function seed(db: D1Database, userId: string) {
  await db.prepare("INSERT INTO user_checks (user_id, event_slug) VALUES (?, 'ev')").bind(userId).run();
  await db.prepare("INSERT INTO user_wishlist (user_id, event_slug) VALUES (?, 'ev')").bind(userId).run();
  await db.prepare("INSERT INTO user_wishlist_version (user_id) VALUES (?)").bind(userId).run();
  await db.prepare("INSERT INTO feedback (message, user_id) VALUES ('hi', ?)").bind(userId).run();
}

const count = async (db: D1Database, userId: string) => {
  let total = 0;
  for (const table of ["user_checks", "user_wishlist", "user_wishlist_version", "feedback"]) {
    total += Number(await db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ?`).bind(userId).first("n"));
  }
  return total;
};

afterEach(() => vi.unstubAllGlobals());

describe("syncDeletions", () => {
  it("deletes a queued user's rows, keeps others, then acks", async () => {
    const e = env();
    await seed(e.DB, "gone");
    await seed(e.DB, "kept");
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${url} ${(init?.headers as Record<string, string>)["x-app-secret"]}`);
      if (url.includes("/ack")) {
        expect(await count(e.DB, "gone")).toBe(0);
        return new Response('{"ok":true}');
      }
      return new Response(JSON.stringify({ deletions: [{ userId: "gone" }] }));
    }));

    expect(await syncDeletions(e as any)).toBe(1);
    expect(calls).toEqual([
      "GET https://auth.bini59.dev/deletions?client_id=seoko-maps secret",
      "POST https://auth.bini59.dev/deletions/gone/ack?client_id=seoko-maps secret",
    ]);
    expect(await count(e.DB, "kept")).toBe(4);
  });

  it("does nothing when auth is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await syncDeletions({ ...env(), AUTH_CLIENT_SECRET: undefined } as any)).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
