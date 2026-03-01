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

CREATE INDEX IF NOT EXISTS clickmap_events_project_time_idx
  ON clickmap_events (project_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS clickmap_events_project_route_time_idx
  ON clickmap_events (project_id, route_key, occurred_at DESC);

CREATE INDEX IF NOT EXISTS clickmap_events_project_page_time_idx
  ON clickmap_events (project_id, page_path, occurred_at DESC);

CREATE INDEX IF NOT EXISTS clickmap_events_project_session_idx
  ON clickmap_events (project_id, session_id);

CREATE INDEX IF NOT EXISTS clickmap_events_project_user_idx
  ON clickmap_events (project_id, user_id);

CREATE TABLE IF NOT EXISTS clickmap_sessions (
  project_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  first_path TEXT NOT NULL,
  last_path TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, session_id)
);

CREATE TABLE IF NOT EXISTS clickmap_heatmap_bins_daily (
  day DATE NOT NULL,
  project_id TEXT NOT NULL,
  route_key TEXT NOT NULL,
  page_path TEXT NOT NULL,
  device_type TEXT NOT NULL,
  x_bucket SMALLINT NOT NULL,
  y_bucket SMALLINT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (day, project_id, route_key, page_path, device_type, x_bucket, y_bucket)
);

CREATE TABLE IF NOT EXISTS clickmap_element_clicks_daily (
  day DATE NOT NULL,
  project_id TEXT NOT NULL,
  route_key TEXT NOT NULL,
  page_path TEXT NOT NULL,
  selector_masked_path TEXT NOT NULL,
  clicks INTEGER NOT NULL,
  rage_clicks INTEGER NOT NULL,
  dead_clicks INTEGER NOT NULL,
  PRIMARY KEY (day, project_id, route_key, page_path, selector_masked_path)
);

CREATE TABLE IF NOT EXISTS clickmap_ingest_batches (
  batch_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_count INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'adapter',
  status TEXT NOT NULL DEFAULT 'accepted'
);
