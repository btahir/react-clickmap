-- Migration 0002: document-relative coordinates + coordinate-space-aware
-- daily heatmap bins.
--
-- This migration is additive and safe to run on a database that already holds
-- 0001 data. New columns are nullable (or defaulted), so existing rows keep
-- loading unchanged and clients that only report viewport coordinates keep
-- working.

-- 1. Document-relative coordinates on raw events. docX/docY are percentages
--    (0-100) of the full document scrollWidth/scrollHeight at capture time;
--    doc_w/doc_h record the absolute document size (px) so viewers can
--    reconstruct pixel positions and filter by layout/breakpoint.
ALTER TABLE clickmap_events
  ADD COLUMN IF NOT EXISTS doc_x_pct DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS doc_y_pct DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS doc_w INTEGER,
  ADD COLUMN IF NOT EXISTS doc_h INTEGER;

-- 2. Daily heatmap bins become coordinate-space aware so a single rollup can
--    serve both viewport and document (full-page) heatmaps. Existing rows
--    default to 'viewport'. The primary key is widened to include the space.
--    ref_w/ref_h carry the reference canvas size (max viewport / document size
--    seen that day) so aggregated reads can size the overlay without scanning
--    the raw events table.
ALTER TABLE clickmap_heatmap_bins_daily
  ADD COLUMN IF NOT EXISTS coordinate_space TEXT NOT NULL DEFAULT 'viewport',
  ADD COLUMN IF NOT EXISTS ref_w INTEGER,
  ADD COLUMN IF NOT EXISTS ref_h INTEGER;

ALTER TABLE clickmap_heatmap_bins_daily
  DROP CONSTRAINT IF EXISTS clickmap_heatmap_bins_daily_pkey;

ALTER TABLE clickmap_heatmap_bins_daily
  ADD PRIMARY KEY (
    day,
    project_id,
    route_key,
    page_path,
    device_type,
    coordinate_space,
    x_bucket,
    y_bucket
  );
