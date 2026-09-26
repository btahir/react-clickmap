import type { CaptureEvent } from "react-clickmap";
import { describe, expect, it, vi } from "vitest";
import { createSupabaseAdapter } from "../src/supabase-adapter";

function buildEvent(overrides: Partial<CaptureEvent> = {}): CaptureEvent {
  return {
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
    ...overrides,
  } as CaptureEvent;
}

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
      headers: new Headers({
        "content-range": `0-${Array.isArray(responseBody) ? Math.max(0, responseBody.length - 1) : 0}/${Array.isArray(responseBody) ? responseBody.length : 0}`,
      }),
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
    expect(url).toContain("occurred_at=lt.");
    // Both filters should be present (this validates the append fix)
    const occurrences = url.split("occurred_at=").length - 1;
    expect(occurrences).toBe(2);
  });

  it("applies limit to load queries", async () => {
    const fetch = mockFetch([]);
    const adapter = createSupabaseAdapter({ ...BASE_OPTIONS, fetchImpl: fetch });

    await adapter.load({ limit: 100 });

    expect(fetch.calls[0]!.url).toContain("limit=101");
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

  it("reports supportsAggregation: false since loadAggregated aggregates client-side", () => {
    const adapter = createSupabaseAdapter(BASE_OPTIONS);

    expect(adapter.capabilities.supportsAggregation).toBe(false);
  });

  it("chunks large save() payloads into batches of 500 events", async () => {
    const fetch = mockFetch();
    const adapter = createSupabaseAdapter({ ...BASE_OPTIONS, fetchImpl: fetch });

    const events = Array.from({ length: 1201 }, (_, index) =>
      buildEvent({ eventId: `evt-${index}` }),
    );

    await adapter.save(events);

    expect(fetch.calls).toHaveLength(3);
    const bodySizes = fetch.calls.map(
      (call) => (JSON.parse(String(call.init?.body)) as unknown[]).length,
    );
    expect(bodySizes).toEqual([500, 500, 201]);
  });

  it("saves a single small batch in one request", async () => {
    const fetch = mockFetch();
    const adapter = createSupabaseAdapter({ ...BASE_OPTIONS, fetchImpl: fetch });

    await adapter.save([buildEvent(), buildEvent({ eventId: "evt-2" })]);

    expect(fetch.calls).toHaveLength(1);
  });

  it("loadAggregated bins by viewport x/y when coordinateSpace is omitted", async () => {
    const fetch = mockFetch([
      {
        event_id: "evt-1",
        project_id: "proj-1",
        session_id: "sess-1",
        user_id: null,
        occurred_at: "2026-07-01T00:00:00.000Z",
        event_type: "click",
        page_path: "/home",
        route_key: "/home",
        device_type: "desktop",
        viewport_w: 1920,
        viewport_h: 1080,
        scroll_x: 0,
        scroll_y: 0,
        x_pct: 50,
        y_pct: 25,
        doc_x_pct: 5,
        doc_y_pct: 2,
        doc_w: 1920,
        doc_h: 9000,
        pointer_type: "mouse",
        selector_masked_path: null,
        depth_pct: null,
        max_depth_pct: null,
        payload_jsonb: {},
      },
    ]);
    const adapter = createSupabaseAdapter({ ...BASE_OPTIONS, fetchImpl: fetch });

    const payload = await adapter.loadAggregated!({});

    expect(payload.bins).toEqual([{ x: 50, y: 25, value: 1 }]);
    expect(payload.width).toBe(1920);
    expect(payload.height).toBe(1080);
  });

  it("loadAggregated bins by document doc_x_pct/doc_y_pct when coordinateSpace is document", async () => {
    const fetch = mockFetch([
      {
        event_id: "evt-1",
        project_id: "proj-1",
        session_id: "sess-1",
        user_id: null,
        occurred_at: "2026-07-01T00:00:00.000Z",
        event_type: "click",
        page_path: "/home",
        route_key: "/home",
        device_type: "desktop",
        viewport_w: 1920,
        viewport_h: 1080,
        scroll_x: 0,
        scroll_y: 4000,
        x_pct: 50,
        y_pct: 25,
        doc_x_pct: 5,
        doc_y_pct: 92,
        doc_w: 1920,
        doc_h: 9000,
        pointer_type: "mouse",
        selector_masked_path: null,
        depth_pct: null,
        max_depth_pct: null,
        payload_jsonb: {},
      },
      // Predates document coordinates (e.g. captured before migration 0002)
      // and must be skipped rather than binned at (0, 0).
      {
        event_id: "evt-2",
        project_id: "proj-1",
        session_id: "sess-1",
        user_id: null,
        occurred_at: "2026-07-01T00:00:00.000Z",
        event_type: "click",
        page_path: "/home",
        route_key: "/home",
        device_type: "desktop",
        viewport_w: 1920,
        viewport_h: 1080,
        scroll_x: 0,
        scroll_y: 0,
        x_pct: 10,
        y_pct: 10,
        pointer_type: "mouse",
        selector_masked_path: null,
        depth_pct: null,
        max_depth_pct: null,
        payload_jsonb: {},
      },
    ]);
    const adapter = createSupabaseAdapter({ ...BASE_OPTIONS, fetchImpl: fetch });

    const payload = await adapter.loadAggregated!({ coordinateSpace: "document" });

    // Only the event with doc coordinates is binned, and it's binned at its
    // document position (92), not its viewport position (25) or (0, 0).
    expect(payload.bins).toEqual([{ x: 5, y: 92, value: 1 }]);
    expect(payload.width).toBe(1920);
    expect(payload.height).toBe(9000);
  });
});

describe("verified pagination", () => {
  const row = {
    event_id: "a",
    project_id: "p",
    session_id: "s",
    occurred_at: "2026-09-25T00:00:00Z",
    event_type: "click",
    page_path: "/",
    route_key: "/",
    device_type: "desktop",
    viewport_w: 1000,
    viewport_h: 800,
    scroll_x: 0,
    scroll_y: 0,
    x_pct: 20,
    y_pct: 20,
    pointer_type: "mouse",
    schema_version: 1,
  };
  it("continues after a server-limited short page using verified total and stable ordering", async () => {
    let page = 0;
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify([{ ...row, event_id: String(page++) }]), {
          headers: { "content-range": `${page - 1}-${page - 1}/2` },
        }),
    );
    const adapter = createSupabaseAdapter({
      ...BASE_OPTIONS,
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(await adapter.load({})).toHaveLength(2);
    expect(decodeURIComponent(String(fetchImpl.mock.calls[0]?.[0] ?? ""))).toContain(
      "occurred_at.asc,event_id.asc",
    );
  });
  it("rejects missing range totals instead of guessing that a short page is complete", async () => {
    const adapter = createSupabaseAdapter({
      ...BASE_OPTIONS,
      fetchImpl: (async () => new Response(JSON.stringify([row]))) as typeof fetch,
    });
    await expect(adapter.load({})).rejects.toThrow("Content-Range");
  });
  it("enforces configured ceiling even when caller requests more", async () => {
    const adapter = createSupabaseAdapter({
      ...BASE_OPTIONS,
      maxReadEvents: 1,
      fetchImpl: (async () =>
        new Response(JSON.stringify([row, { ...row, event_id: "b" }]), {
          headers: { "content-range": "0-1/2" },
        })) as typeof fetch,
    });
    await expect(adapter.load({ limit: 100 })).rejects.toThrow("limit");
  });
  it("rejects an inconsistent empty page", async () => {
    const adapter = createSupabaseAdapter({
      ...BASE_OPTIONS,
      fetchImpl: (async () =>
        new Response("[]", { headers: { "content-range": "*/10" } })) as typeof fetch,
    });
    await expect(adapter.load({})).rejects.toThrow("Incomplete");
  });
});
