import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCircleWishlist, useEventWishlist } from "../../src/hooks/useWishlist";

const json = (value: unknown) =>
  new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

// @vitest-environment jsdom
describe("useEventWishlist", () => {
  const validEventSlugs = ["ev1"] as const;

  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("removes deleted event slugs from local state before upload", async () => {
    localStorage.setItem("gbc-seoko-event-wishlist", JSON.stringify({ value: ["deleted", "ev1"], updatedAt: null }));
    const puts: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === "PUT") puts.push(JSON.parse(String(init.body)));
      return Promise.resolve(json({ events: ["deleted", "ev1"], updatedAt: null }));
    }));
    const { result } = renderHook(() => useEventWishlist(true, "u1", undefined, undefined, validEventSlugs));
    expect(result.current[0]).toEqual(["ev1"]);
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]).toMatchObject({ events: ["ev1"] });
  });

  it("replaces deleted remote slugs instead of retrying the invalid list", async () => {
    localStorage.setItem("gbc-seoko-event-wishlist", JSON.stringify({ value: ["ev1"], updatedAt: "2026-09-03T00:00:00.001Z" }));
    const puts: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === "PUT") puts.push(JSON.parse(String(init.body)));
      return Promise.resolve(json({ events: ["deleted", "ev1"], updatedAt: "2026-09-03T00:00:00.000Z", saved: true }));
    }));

    const { result } = renderHook(() => useEventWishlist(true, "u1", undefined, undefined, validEventSlugs));

    await waitFor(() => expect(puts).toHaveLength(1));
    expect(result.current[0]).toEqual(["ev1"]);
    expect(puts[0]).toMatchObject({ events: ["ev1"] });
  });

  it("does not dispatch a queued circle save after the user changes", async () => {
    let resolveFetch!: (res: Response) => void;
    const fetchWishlist = new Promise<Response>((resolve) => { resolveFetch = resolve; });
    const puts: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        puts.push(JSON.parse(String(init.body)));
        return Promise.resolve(json({ circles: {}, updatedAt: null, saved: true }));
      }
      return fetchWishlist;
    }));

    const { result, rerender } = renderHook(
      (props) => useCircleWishlist(props.eventSlug, props.authenticated, props.userId),
      { initialProps: { eventSlug: "ev1", authenticated: true, userId: "u1" } },
    );
    act(() => result.current.toggleStar("c1"));
    rerender({ eventSlug: "ev1", authenticated: true, userId: "u2" });
    resolveFetch(json({ circles: {}, updatedAt: null }));
    await act(async () => { await fetchWishlist; });

    expect(puts).toEqual([]);
  });

  it("clears anonymous wishlist before the first authenticated sync", async () => {
    localStorage.setItem("gbc-seoko-event-wishlist", JSON.stringify({ value: ["ev1"], updatedAt: null }));
    const puts: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === "PUT") puts.push(JSON.parse(String(init.body)));
      return Promise.resolve(json({ events: [], updatedAt: null }));
    }));

    const { result, rerender } = renderHook(
      ({ authenticated, userId }) => useEventWishlist(authenticated, userId),
      { initialProps: { authenticated: false, userId: null } },
    );
    act(() => rerender({ authenticated: true, userId: "u1" }));

    await waitFor(() => expect(result.current[0]).toEqual([]));
    expect(puts).toEqual([]);
  });

  it("cleans up storage on account switch", async () => {
    localStorage.setItem("gbc-seoko-event-wishlist", JSON.stringify({ value: ["ev1"], updatedAt: null }));

    const { rerender } = renderHook(
      ({ user }) => useEventWishlist(true, user),
      { initialProps: { user: "u1" } },
    );

    expect(localStorage.getItem("gbc-seoko-event-wishlist")).not.toBeNull();

    rerender({ user: "u2" });

    await waitFor(() => {
      expect(localStorage.getItem("gbc-seoko-event-wishlist")).toBeNull();
    });
  });

  it("guards against out-of-order in-flight responses overriding latest state", async () => {
    let resolveFirst!: (res: Response) => void;
    let resolveSecond!: (res: Response) => void;
    const firstPut = new Promise<Response>((r) => { resolveFirst = r; });
    const secondPut = new Promise<Response>((r) => { resolveSecond = r; });
    const puts: any[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        if (init?.method === "PUT") {
          puts.push(JSON.parse(String(init.body)));
          return puts.length === 1 ? firstPut : secondPut;
        }
        return Promise.resolve(json({ events: [], updatedAt: null }));
      }),
    );

    const { result } = renderHook(() => useEventWishlist(true, "u1"));

    act(() => {
      result.current[1]("ev1");
    });
    expect(result.current[0]).toEqual(["ev1"]);

    act(() => {
      result.current[1]("ev2");
    });
    expect(result.current[0]).toEqual(["ev1", "ev2"]);

    await act(async () => {
      resolveFirst(json({ events: ["ev1"], updatedAt: "2026-09-03T00:00:00.001Z", saved: true }));
    });

    await waitFor(() => expect(puts).toHaveLength(2));

    await act(async () => {
      resolveSecond(json({ events: ["ev1", "ev2"], updatedAt: "2026-09-03T00:00:00.002Z", saved: true }));
    });

    expect(result.current[0]).toEqual(["ev1", "ev2"]);
  });
});

describe("useCircleWishlist", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("toggles star immediately and flushes pending memo on unmount", async () => {
    const puts: any[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        if (init?.method === "PUT") {
          puts.push(JSON.parse(String(init.body)));
          return Promise.resolve(json({ circles: puts[puts.length - 1].circles, updatedAt: "2026-09-03T00:00:00.001Z", saved: true }));
        }
        return Promise.resolve(json({ circles: {}, updatedAt: null }));
      }),
    );

    const { result, unmount } = renderHook(() => useCircleWishlist("ev1", true, "u1"));

    act(() => {
      result.current.toggleStar("c1");
    });

    expect(result.current.circles.c1?.star).toBe(true);
    await waitFor(() => expect(puts.length).toBe(1));
    expect(puts[0].circles).toEqual({ c1: { star: true } });

    act(() => {
      result.current.updateMemo("c1", "important note");
    });
    expect(puts.length).toBe(1);

    unmount();

    await waitFor(() => expect(puts.length).toBe(2));
    expect(puts[1].circles).toEqual({ c1: { star: true, memo: "important note" } });
  });

  it("clears empty memo and removes unstarred entry", async () => {
    const { result } = renderHook(() => useCircleWishlist("ev1", false, null));

    act(() => {
      result.current.updateMemo("c1", "first memo");
    });
    expect(result.current.circles.c1?.memo).toBe("first memo");

    act(() => {
      result.current.updateMemo("c1", "   ");
    });
    expect(result.current.circles.c1).toBeUndefined();
  });

  it.each([
    ["logout", { eventSlug: "ev1", authenticated: true, userId: "u1" }, { eventSlug: "ev1", authenticated: false, userId: null }],
    ["account switch", { eventSlug: "ev1", authenticated: true, userId: "u1" }, { eventSlug: "ev1", authenticated: true, userId: "u2" }],
    ["event switch", { eventSlug: "ev1", authenticated: true, userId: "u1" }, { eventSlug: "ev2", authenticated: true, userId: "u1" }],
  ])("does not flush a pending memo after %s", async (_change, initial, next) => {
    const puts: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === "PUT") puts.push(JSON.parse(String(init.body)));
      return Promise.resolve(json({ circles: {}, updatedAt: null, saved: true }));
    }));

    const { result, rerender } = renderHook(
      (props) => useCircleWishlist(props.eventSlug, props.authenticated, props.userId),
      { initialProps: initial },
    );
    act(() => result.current.updateMemo("c1", "old user note"));
    rerender(next);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 550)); });

    expect(puts).toEqual([]);
  });
});
