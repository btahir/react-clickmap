export const POSTGRES_INIT_SQL = `
CREATE TABLE IF NOT EXISTS clickmap_events (
  event_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT NOT NULL,
  page_path TEXT NOT NULL,
  route_key TEXT NOT NULL,
  device_type TEXT NOT NULL,
  viewport_w INTEGER NOT NULL,
  viewport_h INTEGER NOT NULL,
  scroll_x INTEGER NOT NULL,
  scroll_y INTEGER NOT NULL,
  x_pct DOUBLE PRECISION,
  y_pct DOUBLE PRECISION,
  pointer_type TEXT,
  selector_hash TEXT,
  selector_masked_path TEXT,
  depth_pct DOUBLE PRECISION,
  max_depth_pct DOUBLE PRECISION,
  is_rage_click BOOLEAN NOT NULL DEFAULT FALSE,
  is_dead_click BOOLEAN NOT NULL DEFAULT FALSE,
  payload_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  schema_version INTEGER NOT NULL DEFAULT 1
);
`;
