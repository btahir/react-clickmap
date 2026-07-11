---
"react-clickmap": minor
"@react-clickmap/postgres": minor
"@react-clickmap/supabase": patch
---

Document-relative full-page heatmaps and server-side daily rollups.

**react-clickmap**

- Capture now records document-relative coordinates (`docX`/`docY` as percentages of `scrollWidth`/`scrollHeight`, plus absolute `docWidth`/`docHeight`) on every click, dead-click, rage-click, and pointer-move event, alongside the existing viewport coordinates. The new fields are additive and optional, so previously stored data still loads.
- `Heatmap`, `AttentionHeatmap`, and `ElementClickOverlay` accept `coordinateSpace?: "viewport" | "document"` (default `"viewport"`, zero breaking change). In `"document"` mode the overlay is a `position: absolute` layer spanning the full document height, points are placed from document-relative coordinates, and it re-renders on resize. Events without document coordinates are skipped in document mode. `ScrollDepth` is unchanged.
- Added `coordinateSpace` to `HeatmapQuery` and exported the `CoordinateSpace` and `DocumentPosition` types.

**@react-clickmap/postgres**

- Added `sql/0002_document_coordinates.sql`: adds nullable `doc_x_pct`/`doc_y_pct`/`doc_w`/`doc_h` columns to `clickmap_events` and makes `clickmap_heatmap_bins_daily` coordinate-space aware (`coordinate_space` in the primary key, plus `ref_w`/`ref_h`). The adapter reads/writes these columns; rows without them keep working.
- Added `rollupDaily(sql, { day?, routeKey?, projectId? })`: idempotent daily aggregation of raw events into the `clickmap_heatmap_bins_daily` and `clickmap_element_clicks_daily` rollup tables, for both coordinate spaces. Intended to run on a schedule (cron / `pg_cron`).
- `loadAggregated()` now reads pre-computed daily bins for day-aligned ranges (falling back to raw aggregation otherwise) and supports `coordinateSpace: "document"`. New adapter options `preferDailyBins` and `binsTableName`.

**@react-clickmap/supabase**

- The adapter reads/writes the additive document-coordinate columns. Documented the required column migration and a `pg_cron` rollup pattern (client-side aggregation is unchanged).
