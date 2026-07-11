import type { CaptureEvent, ClickmapAdapter } from "react-clickmap";

export interface SqlQueryResult<Row = unknown> {
  rows: Row[];
  rowCount?: number | null;
}

export interface SqlExecutor {
  query<Row = unknown>(text: string, params?: readonly unknown[]): Promise<SqlQueryResult<Row>>;
}

export interface PostgresAdapterOptions {
  sql: SqlExecutor;
  tableName?: string;
  /**
   * Daily heatmap-bin rollup table used by `loadAggregated` for day-aligned
   * ranges. Defaults to `clickmap_heatmap_bins_daily`.
   */
  binsTableName?: string;
  /**
   * When `true` (default), `loadAggregated` reads pre-computed daily bins for
   * day-aligned ranges (see `rollupDaily`), falling back to raw aggregation
   * otherwise. Set `false` to always aggregate raw events.
   */
  preferDailyBins?: boolean;
}

export interface RollupOptions {
  /**
   * UTC day to roll up. Accepts a `Date` or an ISO `YYYY-MM-DD` string.
   * Defaults to the previous UTC day (the last complete day).
   */
  day?: string | Date;
  /** Only roll up a single route key (otherwise every route for the day). */
  routeKey?: string;
  /** Only roll up a single project (otherwise every project for the day). */
  projectId?: string;
  /** Raw events table. Defaults to `clickmap_events`. */
  tableName?: string;
  /** Daily heatmap-bin table. Defaults to `clickmap_heatmap_bins_daily`. */
  binsTableName?: string;
  /** Daily element-click table. Defaults to `clickmap_element_clicks_daily`. */
  elementsTableName?: string;
}

export interface RollupResult {
  /** The UTC day that was rolled up, as `YYYY-MM-DD`. */
  day: string;
  /** Number of heatmap-bin rows written (both coordinate spaces combined). */
  binRows: number;
  /** Number of element-click rows written. */
  elementRows: number;
}

export interface PostgresEventRow {
  event_id: string;
  project_id: string;
  session_id: string;
  user_id: string | null;
  occurred_at: string | Date;
  event_type: CaptureEvent["type"];
  page_path: string;
  route_key: string;
  device_type: CaptureEvent["deviceType"];
  viewport_w: number;
  viewport_h: number;
  scroll_x: number;
  scroll_y: number;
  x_pct: number | null;
  y_pct: number | null;
  doc_x_pct?: number | null;
  doc_y_pct?: number | null;
  doc_w?: number | null;
  doc_h?: number | null;
  pointer_type: CaptureEvent extends { pointerType: infer T } ? T | null : null;
  selector_masked_path: string | null;
  depth_pct: number | null;
  max_depth_pct: number | null;
  is_rage_click: boolean;
  is_dead_click: boolean;
  payload_jsonb: Record<string, unknown> | null;
  schema_version: number;
}

export type PostgresClickmapAdapter = ClickmapAdapter;
