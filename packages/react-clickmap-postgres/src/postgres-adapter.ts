import type {
  AggregatedHeatmapPayload,
  CaptureEvent,
  ClickmapAdapter,
  HeatmapQuery,
  PointerType,
} from "react-clickmap";
import type { PostgresAdapterOptions, PostgresEventRow } from "./types";

interface BuiltWhere {
  whereClause: string;
  params: unknown[];
  nextParamIndex: number;
}

function assertTableName(tableName: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error(`react-clickmap-postgres: invalid table name "${tableName}"`);
  }

  return tableName;
}

function buildWhereClause(query: HeatmapQuery, startParamIndex = 1): BuiltWhere {
  const params: unknown[] = [];
  const clauses: string[] = [];
  let index = startParamIndex;

  if (query.page) {
    clauses.push(`page_path = $${index}`);
    params.push(query.page);
    index += 1;
  }

  if (query.routeKey) {
    clauses.push(`route_key = $${index}`);
    params.push(query.routeKey);
    index += 1;
  }

  if (query.sessionId) {
    clauses.push(`session_id = $${index}`);
    params.push(query.sessionId);
    index += 1;
  }

  if (query.projectId) {
    clauses.push(`project_id = $${index}`);
    params.push(query.projectId);
    index += 1;
  }

  if (query.userId) {
    clauses.push(`user_id = $${index}`);
    params.push(query.userId);
    index += 1;
  }

  if (query.device && query.device !== "all") {
    clauses.push(`device_type = $${index}`);
    params.push(query.device);
    index += 1;
  }

  if (query.types && query.types.length > 0) {
    clauses.push(`event_type = ANY($${index}::text[])`);
    params.push(query.types);
    index += 1;
  }

  if (typeof query.from === "number") {
    clauses.push(`occurred_at >= $${index}`);
    params.push(new Date(query.from));
    index += 1;
  }

  if (typeof query.to === "number") {
    clauses.push(`occurred_at <= $${index}`);
    params.push(new Date(query.to));
    index += 1;
  }

  return {
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
    nextParamIndex: index,
  };
}

function normalizePointerType(pointerType: string | null): PointerType {
  if (pointerType === "mouse" || pointerType === "touch" || pointerType === "pen") {
    return pointerType;
  }

  return "unknown";
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function mapRowToEvent(row: PostgresEventRow): CaptureEvent {
  const occurredAt = row.occurred_at instanceof Date ? row.occurred_at : new Date(row.occurred_at);
  const payload = row.payload_jsonb ?? {};

  const base = {
    schemaVersion: 1 as const,
    eventVersion: 1 as const,
    eventId: row.event_id,
    projectId: row.project_id,
    sessionId: row.session_id,
    timestamp: occurredAt.getTime(),
    pathname: row.page_path,
    routeKey: row.route_key,
    deviceType: row.device_type,
    viewport: {
      width: row.viewport_w,
      height: row.viewport_h,
      scrollX: row.scroll_x,
      scrollY: row.scroll_y,
    },
  };
  const withUserId = row.user_id ? { ...base, userId: row.user_id } : base;
  const withSelector = row.selector_masked_path
    ? { selector: row.selector_masked_path }
    : ({} as Record<string, never>);

  switch (row.event_type) {
    case "scroll":
      return {
        ...withUserId,
        type: "scroll",
        depth: row.depth_pct ?? 0,
        maxDepth: row.max_depth_pct ?? 0,
      };
    case "pointer-move":
      return {
        ...withUserId,
        type: "pointer-move",
        x: row.x_pct ?? 0,
        y: row.y_pct ?? 0,
        pointerType: normalizePointerType(row.pointer_type),
      };
    case "rage-click":
      return {
        ...withUserId,
        type: "rage-click",
        x: row.x_pct ?? 0,
        y: row.y_pct ?? 0,
        ...withSelector,
        pointerType: normalizePointerType(row.pointer_type),
        clusterSize: toNumber(payload.clusterSize, 3),
        windowMs: toNumber(payload.windowMs, 500),
        radiusPx: toNumber(payload.radiusPx, 30),
      };
    case "dead-click":
      return {
        ...withUserId,
        type: "dead-click",
        x: row.x_pct ?? 0,
        y: row.y_pct ?? 0,
        ...withSelector,
        pointerType: normalizePointerType(row.pointer_type),
        reason: "non-interactive-target",
      };
    default:
      return {
        ...withUserId,
        type: "click",
        x: row.x_pct ?? 0,
        y: row.y_pct ?? 0,
        ...withSelector,
        pointerType: normalizePointerType(row.pointer_type),
      };
  }
}

function toInsertRecord(event: CaptureEvent): unknown[] {
  const hasCoordinates = "x" in event && "y" in event;
  const hasPointerType = "pointerType" in event;
  const hasSelector = "selector" in event;

  let payload: Record<string, unknown> = {};

  if (event.type === "rage-click") {
    payload = {
      clusterSize: event.clusterSize,
      windowMs: event.windowMs,
      radiusPx: event.radiusPx,
    };
  } else if (event.type === "dead-click") {
    payload = {
      reason: event.reason,
    };
  }

  return [
    event.eventId,
    event.projectId,
    event.sessionId,
    event.userId ?? null,
    new Date(event.timestamp),
    event.type,
    event.pathname,
    event.routeKey,
    event.deviceType,
    event.viewport.width,
    event.viewport.height,
    event.viewport.scrollX,
    event.viewport.scrollY,
    hasCoordinates ? event.x : null,
    hasCoordinates ? event.y : null,
    hasPointerType ? event.pointerType : null,
    hasSelector ? (event.selector ?? null) : null,
    event.type === "scroll" ? event.depth : null,
    event.type === "scroll" ? event.maxDepth : null,
    event.type === "rage-click",
    event.type === "dead-click",
    payload,
    event.schemaVersion,
  ];
}

export function createPostgresAdapter(options: PostgresAdapterOptions): ClickmapAdapter {
  const table = assertTableName(options.tableName ?? "clickmap_events");

  return {
    capabilities: {
      supportsAggregation: true,
      supportsRetention: true,
      supportsIdempotency: true,
    },

    async save(events: CaptureEvent[]): Promise<void> {
      if (events.length === 0) {
        return;
      }

      const query = `
        INSERT INTO ${table} (
          event_id,
          project_id,
          session_id,
          user_id,
          occurred_at,
          event_type,
          page_path,
          route_key,
          device_type,
          viewport_w,
          viewport_h,
          scroll_x,
          scroll_y,
          x_pct,
          y_pct,
          pointer_type,
          selector_masked_path,
          depth_pct,
          max_depth_pct,
          is_rage_click,
          is_dead_click,
          payload_jsonb,
          schema_version
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20,
          $21, $22, $23
        )
        ON CONFLICT (event_id) DO NOTHING
      `;

      for (const event of events) {
        await options.sql.query(query, toInsertRecord(event));
      }
    },

    async load(query: HeatmapQuery): Promise<CaptureEvent[]> {
      const { whereClause, params, nextParamIndex } = buildWhereClause(query);

      const limitClause =
        typeof query.limit === "number" && query.limit > 0 ? `LIMIT $${nextParamIndex}` : "";

      if (limitClause) {
        params.push(query.limit);
      }

      const result = await options.sql.query<PostgresEventRow>(
        `
        SELECT
          event_id,
          project_id,
          session_id,
          user_id,
          occurred_at,
          event_type,
          page_path,
          route_key,
          device_type,
          viewport_w,
          viewport_h,
          scroll_x,
          scroll_y,
          x_pct,
          y_pct,
          pointer_type,
          selector_masked_path,
          depth_pct,
          max_depth_pct,
          is_rage_click,
          is_dead_click,
          payload_jsonb,
          schema_version
        FROM ${table}
        ${whereClause}
        ORDER BY occurred_at ASC
        ${limitClause}
      `,
        params,
      );

      return result.rows.map((row) => mapRowToEvent(row));
    },

    async deleteEvents(query: HeatmapQuery): Promise<number> {
      const { whereClause, params } = buildWhereClause(query);
      if (!whereClause) {
        throw new Error(
          "react-clickmap-postgres: deleteEvents requires at least one filter in the query",
        );
      }

      const result = await options.sql.query(`DELETE FROM ${table} ${whereClause}`, params);
      return result.rowCount ?? 0;
    },

    async loadAggregated(query: HeatmapQuery): Promise<AggregatedHeatmapPayload> {
      const { whereClause, params } = buildWhereClause(query);

      const binsResult = await options.sql.query<{ x: number; y: number; value: number }>(
        `
        SELECT
          ROUND(x_pct::numeric, 2)::double precision AS x,
          ROUND(y_pct::numeric, 2)::double precision AS y,
          SUM(CASE WHEN is_rage_click THEN 2 ELSE 1 END)::double precision AS value
        FROM ${table}
        ${whereClause} ${whereClause ? "AND" : "WHERE"} x_pct IS NOT NULL AND y_pct IS NOT NULL
        GROUP BY 1, 2
      `,
        params,
      );

      const viewportResult = await options.sql.query<{ width: number; height: number }>(
        `
        SELECT
          COALESCE(MAX(viewport_w), 1000) AS width,
          COALESCE(MAX(viewport_h), 800) AS height
        FROM ${table}
        ${whereClause}
      `,
        params,
      );

      const viewport = viewportResult.rows[0];

      return {
        width: viewport?.width ?? 1000,
        height: viewport?.height ?? 800,
        bins: binsResult.rows,
        totalEvents: binsResult.rows.reduce((sum, bin) => sum + bin.value, 0),
      };
    },
  };
}
