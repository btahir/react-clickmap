import type { ClickmapAdapter } from "react-clickmap";

export interface SupabaseAdapterOptions {
  url: string;
  anonKey: string;
  table?: string;
  schema?: string;
  fetchImpl?: typeof fetch;
}

export interface SupabaseEventRow {
  event_id: string;
  project_id: string;
  session_id: string;
  user_id: string | null;
  occurred_at: string;
  event_type: string;
  page_path: string;
  route_key: string;
  device_type: string;
  viewport_w: number;
  viewport_h: number;
  scroll_x: number;
  scroll_y: number;
  x_pct: number | null;
  y_pct: number | null;
  pointer_type: string | null;
  selector_masked_path: string | null;
  depth_pct: number | null;
  max_depth_pct: number | null;
  is_rage_click: boolean;
  is_dead_click: boolean;
  payload_jsonb: Record<string, unknown> | null;
  schema_version: number;
}

export type SupabaseClickmapAdapter = ClickmapAdapter;
