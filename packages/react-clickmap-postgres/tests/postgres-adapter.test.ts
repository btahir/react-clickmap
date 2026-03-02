import { describe, expect, it, vi } from "vitest";
import { createPostgresAdapter } from "../src/postgres-adapter";
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
    expect(sql.calls[0]!.params).toHaveLength(23);
    expect(sql.calls[0]!.params![0]).toBe("evt-001");
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
});
