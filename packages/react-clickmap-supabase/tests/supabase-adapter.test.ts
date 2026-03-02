import { describe, expect, it, vi } from "vitest";
import { createSupabaseAdapter } from "../src/supabase-adapter";

function mockFetch(
  responseBody: unknown = [],
  status = 200,
): typeof fetch & { calls: Array<{ url: string; init?: RequestInit }> } {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fn = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => responseBody,
    } as Response;
  };
  fn.calls = calls;
  return fn as typeof fetch & { calls: Array<{ url: string; init?: RequestInit }> };
}

const BASE_OPTIONS = {
  url: "https://test.supabase.co",
  anonKey: "test-key",
};

describe("createSupabaseAdapter", () => {
  it("saves events via POST with correct headers", async () => {
    const fetch = mockFetch();
    const adapter = createSupabaseAdapter({ ...BASE_OPTIONS, fetchImpl: fetch });

    await adapter.save([
      {
        schemaVersion: 1,
        eventVersion: 1,
        eventId: "evt-1",
        projectId: "proj-1",
        sessionId: "sess-1",
        timestamp: 1700000000000,
        pathname: "/home",
        routeKey: "/home",
        deviceType: "desktop",
        viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: 0 },
        type: "click",
        x: 50,
        y: 25,
        pointerType: "mouse",
      },
    ]);

    expect(fetch.calls).toHaveLength(1);
    expect(fetch.calls[0]!.init?.method).toBe("POST");
    expect(fetch.calls[0]!.url).toContain("/rest/v1/clickmap_events");
    const headers = fetch.calls[0]!.init?.headers as Record<string, string>;
    expect(headers.apikey).toBe("test-key");
    expect(headers.Prefer).toBe("resolution=ignore-duplicates");
  });

  it("skips save for empty array", async () => {
    const fetch = mockFetch();
    const adapter = createSupabaseAdapter({ ...BASE_OPTIONS, fetchImpl: fetch });

    await adapter.save([]);

    expect(fetch.calls).toHaveLength(0);
  });

  it("loads events with query filters", async () => {
    const fetch = mockFetch([]);
    const adapter = createSupabaseAdapter({ ...BASE_OPTIONS, fetchImpl: fetch });

    await adapter.load({ page: "/about", device: "mobile" });

    const url = fetch.calls[0]!.url;
    expect(url).toContain("page_path=eq.%2Fabout");
    expect(url).toContain("device_type=eq.mobile");
  });

  it("handles date range filters without overwriting", async () => {
    const fetch = mockFetch([]);
    const adapter = createSupabaseAdapter({ ...BASE_OPTIONS, fetchImpl: fetch });

    await adapter.load({ from: 1700000000000, to: 1700100000000 });

    const url = fetch.calls[0]!.url;
    expect(url).toContain("occurred_at=gte.");
    expect(url).toContain("occurred_at=lte.");
    // Both filters should be present (this validates the append fix)
    const occurrences = url.split("occurred_at=").length - 1;
    expect(occurrences).toBe(2);
  });

  it("applies limit to load queries", async () => {
    const fetch = mockFetch([]);
    const adapter = createSupabaseAdapter({ ...BASE_OPTIONS, fetchImpl: fetch });

    await adapter.load({ limit: 100 });

    expect(fetch.calls[0]!.url).toContain("limit=100");
  });

  it("throws on failed save", async () => {
    const fetch = mockFetch({}, 500);
    const adapter = createSupabaseAdapter({ ...BASE_OPTIONS, fetchImpl: fetch });

    await expect(
      adapter.save([
        {
          schemaVersion: 1,
          eventVersion: 1,
          eventId: "evt-1",
          projectId: "proj-1",
          sessionId: "sess-1",
          timestamp: 1700000000000,
          pathname: "/",
          routeKey: "/",
          deviceType: "desktop",
          viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: 0 },
          type: "click",
          x: 50,
          y: 25,
          pointerType: "mouse",
        },
      ]),
    ).rejects.toThrow("Status: 500");
  });

  it("deleteEvents requires at least one filter", async () => {
    const fetch = mockFetch([]);
    const adapter = createSupabaseAdapter({ ...BASE_OPTIONS, fetchImpl: fetch });

    await expect(adapter.deleteEvents!({})).rejects.toThrow("at least one query filter");
  });

  it("deleteEvents returns count of deleted rows", async () => {
    const fetch = mockFetch([{ id: 1 }, { id: 2 }]);
    const adapter = createSupabaseAdapter({ ...BASE_OPTIONS, fetchImpl: fetch });

    const count = await adapter.deleteEvents!({ sessionId: "sess-1" });

    expect(count).toBe(2);
    expect(fetch.calls[0]!.init?.method).toBe("DELETE");
  });

  it("uses custom table name", async () => {
    const fetch = mockFetch([]);
    const adapter = createSupabaseAdapter({
      ...BASE_OPTIONS,
      fetchImpl: fetch,
      table: "custom_events",
    });

    await adapter.load({});

    expect(fetch.calls[0]!.url).toContain("/rest/v1/custom_events");
  });

  it("filters by event types", async () => {
    const fetch = mockFetch([]);
    const adapter = createSupabaseAdapter({ ...BASE_OPTIONS, fetchImpl: fetch });

    await adapter.load({ types: ["click", "rage-click"] });

    const url = fetch.calls[0]!.url;
    // URLSearchParams encodes parens and commas
    expect(url).toContain("event_type=in.%28click%2Crage-click%29");
  });
});
