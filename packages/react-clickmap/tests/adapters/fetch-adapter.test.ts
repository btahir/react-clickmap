import { describe, expect, it, vi } from "vitest";
import { fetchAdapter } from "../../src/adapters/fetch-adapter";
import { createEvent } from "../fixtures";

describe("fetchAdapter", () => {
  it("posts events with keepalive fallback", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 }));
    const adapter = fetchAdapter({ endpoint: "/api/clickmap", fetchImpl, preferBeacon: false });

    await adapter.save([createEvent()]);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0] ?? [];
    expect(init?.method).toBe("POST");
    expect(init?.keepalive).toBe(true);
  });

  it("loads events from object payload", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ events: [createEvent({ pathname: "/docs" })] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );

    const adapter = fetchAdapter({ endpoint: "/api/clickmap", fetchImpl });
    const events = await adapter.load({ page: "/docs" });

    expect(events).toHaveLength(1);
    expect(events[0]?.pathname).toBe("/docs");
  });

  it("deletes events through delete endpoint", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ deleted: 3 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );

    const adapter = fetchAdapter({
      endpoint: "/api/clickmap",
      deleteEndpoint: "/api/clickmap/delete",
      fetchImpl,
    });

    const deleted = await adapter.deleteEvents?.({ projectId: "proj-1" });

    expect(deleted).toBe(3);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[0]).toContain("/api/clickmap/delete");
    expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe("DELETE");
  });
});
