import { describe, expect, it, vi } from "vitest";
import { createPostgresAdapter } from "../src/postgres-adapter";
import { rollupDaily } from "../src/rollup";
import type { SqlExecutor, SqlQueryResult } from "../src/types";
import type { CaptureEvent } from "react-clickmap";

function mockEvent(overrides: Partial<CaptureEvent> = {}): CaptureEvent {
  return {
    schemaVersion: 1,
    eventVersion: 1,
    eventId: "evt-001",
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

function createMockSql(): SqlExecutor & { calls: Array<{ text: string; params?: readonly unknown[] }> } {
  const calls: Array<{ text: string; params?: readonly unknown[] }> = [];
  return {
    calls,
    async query<Row = unknown>(text: string, params?: readonly unknown[]): Promise<SqlQueryResult<Row>> {
      calls.push({ text, params });
      return { rows: [] as Row[], rowCount: 0 };
    },
  };
}

describe("createPostgresAdapter", () => {
  it("saves events with parameterized queries", async () => {
    const sql = createMockSql();
    const adapter = createPostgresAdapter({ sql });
    const event = mockEvent();

    await adapter.save([event]);

    expect(sql.calls).toHaveLength(1);
    expect(sql.calls[0]!.text).toContain("INSERT INTO clickmap_events");
    expect(sql.calls[0]!.text).toContain("ON CONFLICT (event_id) DO NOTHING");
    expect(sql.calls[0]!.params).toHaveLength(27);
    expect(sql.calls[0]!.params![0]).toBe("evt-001");
  });

  it("batches multiple events into a single multi-row INSERT", async () => {
    const sql = createMockSql();
    const adapter = createPostgresAdapter({ sql });
    const events = [
      mockEvent({ eventId: "evt-001" }),
      mockEvent({ eventId: "evt-002" }),
      mockEvent({ eventId: "evt-003" }),
    ];

    await adapter.save(events);

    // A batch that fits in one statement doesn't need an explicit
    // transaction -- the single INSERT is already atomic.
    expect(sql.calls).toHaveLength(1);
    expect(sql.calls[0]!.text).toContain("INSERT INTO clickmap_events");
    expect(sql.calls[0]!.text).toContain("ON CONFLICT (event_id) DO NOTHING");
    expect(sql.calls[0]!.params).toHaveLength(27 * 3);
    expect(sql.calls[0]!.params![0]).toBe("evt-001");
    expect(sql.calls[0]!.params![27]).toBe("evt-002");
    expect(sql.calls[0]!.params![54]).toBe("evt-003");
  });

  it("wraps large batches in an explicit transaction across multiple INSERT statements", async () => {
    const sql = createMockSql();
    const adapter = createPostgresAdapter({ sql });
    const events = Array.from({ length: 501 }, (_, index) =>
      mockEvent({ eventId: `evt-${index}` }),
    );

    await adapter.save(events);

    expect(sql.calls).toHaveLength(4);
    expect(sql.calls[0]!.text).toBe("BEGIN");
    expect(sql.calls[1]!.text).toContain("INSERT INTO clickmap_events");
    expect(sql.calls[1]!.params).toHaveLength(27 * 500);
    expect(sql.calls[2]!.text).toContain("INSERT INTO clickmap_events");
    expect(sql.calls[2]!.params).toHaveLength(27 * 1);
    expect(sql.calls[3]!.text).toBe("COMMIT");
  });

  it("rolls back the transaction if a chunked insert fails", async () => {
    const calls: Array<{ text: string; params?: readonly unknown[] }> = [];
    const sql: SqlExecutor = {
      async query<Row = unknown>(
        text: string,
        params?: readonly unknown[],
      ): Promise<SqlQueryResult<Row>> {
        calls.push({ text, params });
        if (text.startsWith("\n        INSERT") && calls.length === 2) {
          throw new Error("boom");
        }
        return { rows: [] as Row[], rowCount: 0 };
      },
    };
    const adapter = createPostgresAdapter({ sql });
    const events = Array.from({ length: 501 }, (_, index) =>
      mockEvent({ eventId: `evt-${index}` }),
    );

    await expect(adapter.save(events)).rejects.toThrow("boom");

    expect(calls.map((call) => call.text.trim().split("\n")[0])).toContain("BEGIN");
    expect(calls[calls.length - 1]!.text).toBe("ROLLBACK");
  });

  it("skips save for empty event array", async () => {
    const sql = createMockSql();
    const adapter = createPostgresAdapter({ sql });

    await adapter.save([]);

    expect(sql.calls).toHaveLength(0);
  });

  it("loads events with query filters", async () => {
    const sql = createMockSql();
    const adapter = createPostgresAdapter({ sql });

    await adapter.load({ page: "/about", device: "mobile" });

    expect(sql.calls).toHaveLength(1);
    expect(sql.calls[0]!.text).toContain("WHERE");
    expect(sql.calls[0]!.params).toContain("/about");
    expect(sql.calls[0]!.params).toContain("mobile");
  });

  it("loads events with date range filters", async () => {
    const sql = createMockSql();
    const adapter = createPostgresAdapter({ sql });

    await adapter.load({ from: 1700000000000, to: 1700100000000 });

    expect(sql.calls).toHaveLength(1);
    expect(sql.calls[0]!.text).toContain("occurred_at >= $1");
    expect(sql.calls[0]!.text).toContain("occurred_at <= $2");
    expect(sql.calls[0]!.params).toHaveLength(2);
  });

  it("applies limit when specified", async () => {
    const sql = createMockSql();
    const adapter = createPostgresAdapter({ sql });

    await adapter.load({ limit: 50 });

    expect(sql.calls[0]!.text).toContain("LIMIT");
    expect(sql.calls[0]!.params).toContain(50);
  });

  it("rejects invalid table names", () => {
    const sql = createMockSql();
    expect(() => createPostgresAdapter({ sql, tableName: "DROP TABLE--" })).toThrow(
      "invalid table name",
    );
  });

  it("accepts valid custom table names", () => {
    const sql = createMockSql();
    expect(() => createPostgresAdapter({ sql, tableName: "my_events" })).not.toThrow();
  });

  it("deleteEvents requires at least one filter", async () => {
    const sql = createMockSql();
    const adapter = createPostgresAdapter({ sql });

    await expect(adapter.deleteEvents!({})).rejects.toThrow("at least one filter");
  });

  it("deleteEvents applies filters and returns count", async () => {
    const calls: Array<{ text: string; params?: readonly unknown[] }> = [];
    const sql: SqlExecutor = {
      async query<Row = unknown>(text: string, params?: readonly unknown[]): Promise<SqlQueryResult<Row>> {
        calls.push({ text, params });
        return { rows: [] as Row[], rowCount: 3 };
      },
    };
    const adapter = createPostgresAdapter({ sql });

    const count = await adapter.deleteEvents!({ sessionId: "sess-1" });

    expect(count).toBe(3);
    expect(calls[0]!.text).toContain("DELETE FROM");
    expect(calls[0]!.params).toContain("sess-1");
  });

  it("maps dead-click events correctly on save", async () => {
    const sql = createMockSql();
    const adapter = createPostgresAdapter({ sql });
    const event = mockEvent({
      type: "dead-click",
      reason: "non-interactive-target",
    } as Partial<CaptureEvent>);

    await adapter.save([event]);

    const params = sql.calls[0]!.params!;
    expect(params[5]).toBe("dead-click");
    expect(params[20]).toBe(true); // is_dead_click
  });

  it("maps scroll events correctly on save", async () => {
    const sql = createMockSql();
    const adapter = createPostgresAdapter({ sql });
    const event = mockEvent({
      type: "scroll",
      depth: 45.5,
      maxDepth: 80.2,
    } as Partial<CaptureEvent>);

    await adapter.save([event]);

    const params = sql.calls[0]!.params!;
    expect(params[5]).toBe("scroll");
    expect(params[17]).toBe(45.5); // depth_pct
    expect(params[18]).toBe(80.2); // max_depth_pct
  });

  it("persists document-relative coordinates in the appended columns", async () => {
    const sql = createMockSql();
    const adapter = createPostgresAdapter({ sql });
    const event = mockEvent({
      docX: 12.5,
      docY: 88.25,
      docWidth: 1440,
      docHeight: 9000,
    } as Partial<CaptureEvent>);

    await adapter.save([event]);

    const params = sql.calls[0]!.params!;
    expect(sql.calls[0]!.text).toContain("doc_x_pct");
    expect(params[23]).toBe(12.5); // doc_x_pct
    expect(params[24]).toBe(88.25); // doc_y_pct
    expect(params[25]).toBe(1440); // doc_w
    expect(params[26]).toBe(9000); // doc_h
  });

  it("leaves document columns null when the event has no doc coordinates", async () => {
    const sql = createMockSql();
    const adapter = createPostgresAdapter({ sql });

    await adapter.save([mockEvent()]);

    const params = sql.calls[0]!.params!;
    expect(params[23]).toBeNull();
    expect(params[24]).toBeNull();
    expect(params[25]).toBeNull();
    expect(params[26]).toBeNull();
  });

  it("hydrates document coordinates back onto loaded events", async () => {
    const sql: SqlExecutor = {
      async query<Row = unknown>(): Promise<SqlQueryResult<Row>> {
        return {
          rows: [
            {
              event_id: "evt-1",
              project_id: "proj-1",
              session_id: "sess-1",
              user_id: null,
              occurred_at: new Date(1700000000000),
              event_type: "click",
              page_path: "/home",
              route_key: "/home",
              device_type: "desktop",
              viewport_w: 1440,
              viewport_h: 900,
              scroll_x: 0,
              scroll_y: 500,
              x_pct: 50,
              y_pct: 25,
              doc_x_pct: 12.5,
              doc_y_pct: 88.25,
              doc_w: 1440,
              doc_h: 9000,
              pointer_type: "mouse",
              selector_masked_path: null,
              depth_pct: null,
              max_depth_pct: null,
              is_rage_click: false,
              is_dead_click: false,
              payload_jsonb: {},
              schema_version: 1,
            },
          ] as Row[],
          rowCount: 1,
        };
      },
    };
    const adapter = createPostgresAdapter({ sql });

    const [event] = await adapter.load({ page: "/home" });

    expect(event).toMatchObject({ docX: 12.5, docY: 88.25, docWidth: 1440, docHeight: 9000 });
  });
});

describe("loadAggregated", () => {
  function createRecordingSql(
    rowsFor: (text: string) => unknown[],
  ): SqlExecutor & { calls: Array<{ text: string; params?: readonly unknown[] }> } {
    const calls: Array<{ text: string; params?: readonly unknown[] }> = [];
    return {
      calls,
      async query<Row = unknown>(
        text: string,
        params?: readonly unknown[],
      ): Promise<SqlQueryResult<Row>> {
        calls.push({ text, params });
        return { rows: rowsFor(text) as Row[], rowCount: 0 };
      },
    };
  }

  it("aggregates viewport coordinates from raw events for non-day-aligned ranges", async () => {
    const sql = createRecordingSql((text) =>
      text.includes("SUM(CASE") ? [{ x: 50, y: 25, value: 3 }] : [{ width: 1440, height: 900 }],
    );
    const adapter = createPostgresAdapter({ sql });

    const payload = await adapter.loadAggregated!({ page: "/home" });

    // No day-aligned range -> raw aggregation against clickmap_events.
    expect(sql.calls[0]!.text).toContain("FROM clickmap_events");
    expect(sql.calls[0]!.text).toContain("x_pct");
    expect(payload.bins).toEqual([{ x: 50, y: 25, value: 3 }]);
    expect(payload.totalEvents).toBe(3);
  });

  it("aggregates document coordinates when coordinateSpace is document", async () => {
    const sql = createRecordingSql((text) =>
      text.includes("SUM(CASE") ? [{ x: 12, y: 88, value: 2 }] : [{ width: 1440, height: 9000 }],
    );
    const adapter = createPostgresAdapter({ sql });

    await adapter.loadAggregated!({ page: "/home", coordinateSpace: "document" });

    expect(sql.calls[0]!.text).toContain("doc_x_pct");
    expect(sql.calls[0]!.text).toContain("doc_y_pct");
    expect(sql.calls[1]!.text).toContain("MAX(doc_w)");
  });

  it("reads pre-computed daily bins for day-aligned ranges", async () => {
    const dayMs = Date.UTC(2026, 6, 1);
    const sql = createRecordingSql((text) =>
      text.includes("x_bucket") && text.includes("SUM(value)")
        ? [{ x: 40, y: 10, value: 7 }]
        : [{ width: 1440, height: 900 }],
    );
    const adapter = createPostgresAdapter({ sql });

    const payload = await adapter.loadAggregated!({
      from: dayMs,
      to: dayMs + 86_400_000,
    });

    expect(sql.calls[0]!.text).toContain("FROM clickmap_heatmap_bins_daily");
    expect(sql.calls[0]!.text).toContain("x_bucket");
    expect(sql.calls[0]!.params).toContain("viewport");
    expect(payload.bins).toEqual([{ x: 40, y: 10, value: 7 }]);
    expect(payload.width).toBe(1440);
  });

  it("does not use daily bins when a type filter is present", async () => {
    const dayMs = Date.UTC(2026, 6, 1);
    const sql = createRecordingSql((text) =>
      text.includes("SUM(CASE") ? [{ x: 1, y: 1, value: 1 }] : [{ width: 1000, height: 800 }],
    );
    const adapter = createPostgresAdapter({ sql });

    await adapter.loadAggregated!({
      from: dayMs,
      to: dayMs + 86_400_000,
      types: ["click"],
    });

    expect(sql.calls[0]!.text).toContain("FROM clickmap_events");
  });

  it("can be forced to always aggregate raw events", async () => {
    const dayMs = Date.UTC(2026, 6, 1);
    const sql = createRecordingSql((text) =>
      text.includes("SUM(CASE") ? [{ x: 1, y: 1, value: 1 }] : [{ width: 1000, height: 800 }],
    );
    const adapter = createPostgresAdapter({ sql, preferDailyBins: false });

    await adapter.loadAggregated!({ from: dayMs, to: dayMs + 86_400_000 });

    expect(sql.calls[0]!.text).toContain("FROM clickmap_events");
  });
});

describe("rollupDaily", () => {
  function createRollupSql(): SqlExecutor & {
    calls: Array<{ text: string; params?: readonly unknown[] }>;
  } {
    const calls: Array<{ text: string; params?: readonly unknown[] }> = [];
    return {
      calls,
      async query<Row = unknown>(
        text: string,
        params?: readonly unknown[],
      ): Promise<SqlQueryResult<Row>> {
        calls.push({ text, params });
        return { rows: [] as Row[], rowCount: 5 };
      },
    };
  }

  it("deletes then re-inserts both coordinate spaces inside a transaction", async () => {
    const sql = createRollupSql();

    const result = await rollupDaily(sql, { day: "2026-07-01" });

    const texts = sql.calls.map((call) => call.text.trim());
    expect(texts[0]).toBe("BEGIN");
    expect(texts[texts.length - 1]).toBe("COMMIT");

    const deletes = texts.filter((text) => text.startsWith("DELETE"));
    expect(deletes).toHaveLength(2); // bins + elements
    expect(deletes[0]).toContain("clickmap_heatmap_bins_daily");
    expect(deletes[1]).toContain("clickmap_element_clicks_daily");

    const inserts = texts.filter((text) => text.startsWith("INSERT"));
    // viewport bins + document bins + element clicks
    expect(inserts).toHaveLength(3);
    expect(inserts.some((text) => text.includes("'viewport'"))).toBe(true);
    expect(inserts.some((text) => text.includes("'document'"))).toBe(true);
    expect(inserts.some((text) => text.includes("doc_x_pct"))).toBe(true);

    expect(result.day).toBe("2026-07-01");
    expect(result.binRows).toBe(10); // 5 + 5 rowCount
    expect(result.elementRows).toBe(5);
  });

  it("is idempotent: re-running a day deletes the prior rows first", async () => {
    const sql = createRollupSql();

    await rollupDaily(sql, { day: "2026-07-01" });
    await rollupDaily(sql, { day: "2026-07-01" });

    const deletes = sql.calls.filter((call) => call.text.trim().startsWith("DELETE"));
    // Two runs, two delete statements (bins + elements) each.
    expect(deletes).toHaveLength(4);
    for (const del of deletes) {
      expect(del.params?.[0]).toBe("2026-07-01");
    }
  });

  it("scopes deletes and inserts to a single route when routeKey is given", async () => {
    const sql = createRollupSql();

    await rollupDaily(sql, { day: "2026-07-01", routeKey: "/pricing" });

    const deleteBins = sql.calls.find(
      (call) =>
        call.text.trim().startsWith("DELETE") && call.text.includes("clickmap_heatmap_bins_daily"),
    );
    expect(deleteBins!.text).toContain("route_key = $2");
    expect(deleteBins!.params).toContain("/pricing");

    const insertBins = sql.calls.find(
      (call) => call.text.trim().startsWith("INSERT") && call.text.includes("'viewport'"),
    );
    expect(insertBins!.text).toContain("route_key = $4");
  });

  it("acquires a transaction-scoped advisory lock before deleting/inserting, keyed by day+scope", async () => {
    const sql = createRollupSql();

    await rollupDaily(sql, { day: "2026-07-01", routeKey: "/pricing" });

    const texts = sql.calls.map((call) => call.text.trim());
    const lockIndex = texts.findIndex((text) => text.includes("pg_advisory_xact_lock"));
    const firstDeleteIndex = texts.findIndex((text) => text.startsWith("DELETE"));

    // The lock must be taken before any DELETE/INSERT so two overlapping
    // rollups for the same day+scope serialize instead of racing to insert
    // the same primary key (see the concurrency comment in rollup.ts).
    expect(lockIndex).toBeGreaterThan(-1);
    expect(lockIndex).toBeLessThan(firstDeleteIndex);
    expect(sql.calls[lockIndex]!.params).toEqual([
      "clickmap_heatmap_bins_daily:clickmap_element_clicks_daily:2026-07-01:/pricing:",
    ]);
  });

  it("scopes the advisory lock separately per day so unrelated days don't contend", async () => {
    const sql = createRollupSql();

    await rollupDaily(sql, { day: "2026-07-01" });
    await rollupDaily(sql, { day: "2026-07-02" });

    const lockCalls = sql.calls.filter((call) =>
      call.text.trim().includes("pg_advisory_xact_lock"),
    );
    expect(lockCalls).toHaveLength(2);
    expect(lockCalls[0]!.params).not.toEqual(lockCalls[1]!.params);
  });

  it("rolls back on error", async () => {
    const calls: Array<{ text: string }> = [];
    const sql: SqlExecutor = {
      async query<Row = unknown>(text: string): Promise<SqlQueryResult<Row>> {
        calls.push({ text });
        if (text.trim().startsWith("INSERT")) {
          throw new Error("boom");
        }
        return { rows: [] as Row[], rowCount: 0 };
      },
    };

    await expect(rollupDaily(sql, { day: "2026-07-01" })).rejects.toThrow("boom");
    expect(calls[calls.length - 1]!.text).toBe("ROLLBACK");
  });

  it("rejects invalid table names", async () => {
    const sql = createRollupSql();
    await expect(rollupDaily(sql, { tableName: "DROP TABLE--" })).rejects.toThrow(
      "invalid table name",
    );
  });
});
