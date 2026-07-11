import type {
  AggregatedHeatmapPayload,
  CaptureEvent,
  ClickmapAdapter,
  CoordinateSpace,
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
    throw new Error(`@react-clickmap/postgres: invalid table name "${tableName}"`);
  }

  return tableName;
}

const DEFAULT_BINS_TABLE = "clickmap_heatmap_bins_daily";
const DEFAULT_ELEMENTS_TABLE = "clickmap_element_clicks_daily";
const MS_PER_DAY = 86_400_000;

interface CoordinateColumns {
  space: CoordinateSpace;
  xCol: "x_pct" | "doc_x_pct";
  yCol: "y_pct" | "doc_y_pct";
  wCol: "viewport_w" | "doc_w";
  hCol: "viewport_h" | "doc_h";
  fallbackWidth: number;
  fallbackHeight: number;
}

function coordinateColumns(query: HeatmapQuery): CoordinateColumns {
  if (query.coordinateSpace === "document") {
    return {
      space: "document",
      xCol: "doc_x_pct",
      yCol: "doc_y_pct",
      wCol: "doc_w",
      hCol: "doc_h",
      fallbackWidth: 1440,
      fallbackHeight: 5000,
    };
  }

  return {
    space: "viewport",
    xCol: "x_pct",
    yCol: "y_pct",
    wCol: "viewport_w",
    hCol: "viewport_h",
    fallbackWidth: 1000,
    fallbackHeight: 800,
  };
}

function isUtcMidnight(ms: number): boolean {
  return Number.isFinite(ms) && ms % MS_PER_DAY === 0;
}

function toIsoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Daily bins are usable only for day-aligned ranges with no per-event
 * filtering that the rollup aggregates away (event type, session, user).
 */
function canUseDailyBins(query: HeatmapQuery): boolean {
  if (query.types && query.types.length > 0) {
    return false;
  }

  if (query.sessionId || query.userId) {
    return false;
  }

  if (typeof query.from !== "number" || typeof query.to !== "number") {
    return false;
  }

  return isUtcMidnight(query.from) && isUtcMidnight(query.to);
}

function buildBinsWhereClause(
  query: HeatmapQuery,
  space: CoordinateSpace,
): { whereClause: string; params: unknown[] } {
  const params: unknown[] = [];
  const clauses: string[] = ["coordinate_space = $1"];
  params.push(space);
  let index = 2;

  // `from`/`to` are guaranteed to be UTC-midnight numbers by canUseDailyBins.
  // The range is inclusive of the `from` day and exclusive of the `to` day.
  clauses.push(`day >= $${index}`);
  params.push(toIsoDay(query.from as number));
  index += 1;
  clauses.push(`day < $${index}`);
  params.push(toIsoDay(query.to as number));
  index += 1;

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

  if (query.projectId) {
    clauses.push(`project_id = $${index}`);
    params.push(query.projectId);
    index += 1;
  }

  if (query.device && query.device !== "all") {
    clauses.push(`device_type = $${index}`);
    params.push(query.device);
    index += 1;
  }

  return { whereClause: `WHERE ${clauses.join(" AND ")}`, params };
}

const INSERT_COLUMNS = [
  "event_id",
  "project_id",
  "session_id",
  "user_id",
  "occurred_at",
  "event_type",
  "page_path",
  "route_key",
  "device_type",
  "viewport_w",
  "viewport_h",
  "scroll_x",
  "scroll_y",
  "x_pct",
  "y_pct",
  "pointer_type",
  "selector_masked_path",
  "depth_pct",
  "max_depth_pct",
  "is_rage_click",
  "is_dead_click",
  "payload_jsonb",
  "schema_version",
  // Document-relative coordinates (migration 0002). Appended at the end so
  // the historical column offsets above stay stable. Nullable for rows that
  // only carry viewport coordinates.
  "doc_x_pct",
  "doc_y_pct",
  "doc_w",
  "doc_h",
] as const;

const COLUMNS_PER_ROW = INSERT_COLUMNS.length;
// Postgres has a hard limit of 65535 bound parameters per statement. 500
// rows * 27 columns = 13,500 params, well under that limit while still
// batching most real-world flush sizes into a single round trip.
const MAX_INSERT_ROWS_PER_STATEMENT = 500;

function buildInsertValuesSql(rowCount: number): string {
  const rows: string[] = [];

  for (let row = 0; row < rowCount; row += 1) {
    const offset = row * COLUMNS_PER_ROW;
    const placeholders: string[] = [];

    for (let column = 0; column < COLUMNS_PER_ROW; column += 1) {
      placeholders.push(`$${offset + column + 1}`);
    }

    rows.push(`(${placeholders.join(", ")})`);
  }

  return rows.join(",\n          ");
}

function buildBatchInsertQuery(tableName: string, rowCount: number): string {
  return `
        INSERT INTO ${tableName} (
          ${INSERT_COLUMNS.join(",\n          ")}
        ) VALUES
          ${buildInsertValuesSql(rowCount)}
        ON CONFLICT (event_id) DO NOTHING
      `;
}

function chunkEvents(events: CaptureEvent[], size: number): CaptureEvent[][] {
  const chunks: CaptureEvent[][] = [];

  for (let index = 0; index < events.length; index += size) {
    chunks.push(events.slice(index, index + size));
  }

  return chunks;
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

  // Additive document-relative coordinates. Only present on rows written after
  // migration 0002; older rows leave these undefined.
  const withDoc: Record<string, number> = {};
  if (typeof row.doc_x_pct === "number") withDoc.docX = row.doc_x_pct;
  if (typeof row.doc_y_pct === "number") withDoc.docY = row.doc_y_pct;
  if (typeof row.doc_w === "number") withDoc.docWidth = row.doc_w;
  if (typeof row.doc_h === "number") withDoc.docHeight = row.doc_h;

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
        ...withDoc,
        pointerType: normalizePointerType(row.pointer_type),
      };
    case "rage-click":
      return {
        ...withUserId,
        type: "rage-click",
        x: row.x_pct ?? 0,
        y: row.y_pct ?? 0,
        ...withDoc,
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
        ...withDoc,
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
        ...withDoc,
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
    "docX" in event && typeof event.docX === "number" ? event.docX : null,
    "docY" in event && typeof event.docY === "number" ? event.docY : null,
    "docWidth" in event && typeof event.docWidth === "number" ? event.docWidth : null,
    "docHeight" in event && typeof event.docHeight === "number" ? event.docHeight : null,
  ];
}

export function createPostgresAdapter(options: PostgresAdapterOptions): ClickmapAdapter {
  const table = assertTableName(options.tableName ?? "clickmap_events");
  const binsTable = assertTableName(options.binsTableName ?? DEFAULT_BINS_TABLE);
  const preferDailyBins = options.preferDailyBins ?? true;

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

      const chunks = chunkEvents(events, MAX_INSERT_ROWS_PER_STATEMENT);
      // A single multi-row INSERT is already atomic in Postgres, so when
      // everything fits in one statement there's no need for an explicit
      // transaction. Only wrap in BEGIN/COMMIT when the batch has to be
      // split across multiple statements, so the whole save() call is still
      // all-or-nothing.
      const useExplicitTransaction = chunks.length > 1;

      if (useExplicitTransaction) {
        await options.sql.query("BEGIN");
      }

      try {
        for (const chunk of chunks) {
          const query = buildBatchInsertQuery(table, chunk.length);
          const params = chunk.flatMap((event) => toInsertRecord(event));
          await options.sql.query(query, params);
        }

        if (useExplicitTransaction) {
          await options.sql.query("COMMIT");
        }
      } catch (error) {
        if (useExplicitTransaction) {
          await options.sql.query("ROLLBACK").catch(() => {
            // Best-effort rollback; surface the original error below.
          });
        }

        throw error;
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
          doc_x_pct,
          doc_y_pct,
          doc_w,
          doc_h,
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
          "@react-clickmap/postgres: deleteEvents requires at least one filter in the query",
        );
      }

      const result = await options.sql.query(`DELETE FROM ${table} ${whereClause}`, params);
      return result.rowCount ?? 0;
    },

    async loadAggregated(query: HeatmapQuery): Promise<AggregatedHeatmapPayload> {
      const columns = coordinateColumns(query);

      // Fast path: read pre-computed daily bins for day-aligned ranges.
      if (preferDailyBins && canUseDailyBins(query)) {
        const { whereClause, params } = buildBinsWhereClause(query, columns.space);

        const binsResult = await options.sql.query<{
          x: number;
          y: number;
          value: number;
        }>(
          `
          SELECT
            x_bucket AS x,
            y_bucket AS y,
            SUM(value)::double precision AS value
          FROM ${binsTable}
          ${whereClause}
          GROUP BY x_bucket, y_bucket
        `,
          params,
        );

        const dimsResult = await options.sql.query<{ width: number; height: number }>(
          `
          SELECT
            COALESCE(MAX(ref_w), ${columns.fallbackWidth}) AS width,
            COALESCE(MAX(ref_h), ${columns.fallbackHeight}) AS height
          FROM ${binsTable}
          ${whereClause}
        `,
          params,
        );

        const dims = dimsResult.rows[0];

        return {
          width: dims?.width ?? columns.fallbackWidth,
          height: dims?.height ?? columns.fallbackHeight,
          bins: binsResult.rows,
          totalEvents: binsResult.rows.reduce((sum, bin) => sum + bin.value, 0),
        };
      }

      // Fallback: aggregate raw events in SQL for the requested coordinate space.
      const { whereClause, params } = buildWhereClause(query);

      const binsResult = await options.sql.query<{ x: number; y: number; value: number }>(
        `
        SELECT
          ROUND(${columns.xCol}::numeric, 2)::double precision AS x,
          ROUND(${columns.yCol}::numeric, 2)::double precision AS y,
          SUM(CASE WHEN is_rage_click THEN 2 ELSE 1 END)::double precision AS value
        FROM ${table}
        ${whereClause} ${whereClause ? "AND" : "WHERE"} ${columns.xCol} IS NOT NULL AND ${columns.yCol} IS NOT NULL
        GROUP BY 1, 2
      `,
        params,
      );

      const dimsResult = await options.sql.query<{ width: number; height: number }>(
        `
        SELECT
          COALESCE(MAX(${columns.wCol}), ${columns.fallbackWidth}) AS width,
          COALESCE(MAX(${columns.hCol}), ${columns.fallbackHeight}) AS height
        FROM ${table}
        ${whereClause}
      `,
        params,
      );

      const dims = dimsResult.rows[0];

      return {
        width: dims?.width ?? columns.fallbackWidth,
        height: dims?.height ?? columns.fallbackHeight,
        bins: binsResult.rows,
        totalEvents: binsResult.rows.reduce((sum, bin) => sum + bin.value, 0),
      };
    },
  };
}
