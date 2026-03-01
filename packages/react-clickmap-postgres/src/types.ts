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
