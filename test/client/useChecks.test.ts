// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChecks } from "../../src/hooks/useChecks";

const json = (value: unknown) => new Response(JSON.stringify(value), {
  status: 200,
  headers: { "content-type": "application/json" },
});

describe("useChecks remote queue", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("dispatches rapid toggles with increasing server-anchored timestamps", async () => {
    let resolveFirst!: (response: Response) => void;
    let resolveSecond!: (response: Response) => void;
    const firstPut = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    const secondPut = new Promise<Response>((resolve) => { resolveSecond = resolve; });
    const puts: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        puts.push(JSON.parse(String(init.body)) as Record<string, unknown>);
        return puts.length === 1 ? firstPut : secondPut;
      }
      return Promise.resolve(json({ checks: {}, updatedAt: "2026-09-02T06:00:00.000Z" }));
    }));

    const { result } = renderHook(() => useChecks("ev", false, true, false, undefined, undefined, "user-1"));
    await waitFor(() => expect(localStorage.getItem("gbc-seoko-checks-meta:ev")).toContain("06:00:00.000Z"));

    act(() => {
      result.current[1]("a");
      result.current[1]("b");
    });
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0].updatedAt).toBe("2026-09-02T06:00:00.001Z");

    await act(async () => { resolveFirst(json({ checks: { a: true }, updatedAt: "2026-09-02T06:00:00.002Z", saved: true })); });
    await waitFor(() => expect(puts).toHaveLength(2));
    expect(puts[1].updatedAt).toBe("2026-09-02T06:00:00.003Z");

    await act(async () => { resolveSecond(json({ checks: { a: true, b: true }, updatedAt: "2026-09-02T06:00:00.004Z", saved: true })); });
    await waitFor(() => expect(result.current[0]).toEqual({ a: true, b: true }));
  });
});
