# @react-clickmap/postgres

## 0.4.0

### Minor Changes

- Add an app-embedded Clickmap Studio with real capture diagnostics, cohort filters, target inspection, guarded overlays, and portable versioned JSON/Markdown/CSV/PNG evidence. Ship local deterministic evidence validation/reporting tools and a self-hosted Next/Postgres example.

  Harden ingestion, project boundaries and authenticated reads/deletes; preserve route privacy and stable target/layout identity. Correct session-route-revision scroll denominators, bounded Supabase pagination, Postgres pool transactions and rollup invalidation/coverage. Time queries now use inclusive `from` and exclusive `to`. Existing Next handler consumers must provide a server-owned project and read/delete authorization.

  Update package and site documentation with explicit measurement/privacy limits, server/client entry guidance, discovery files and shared maintainer support.

## 0.3.0

### Minor Changes

- eea0827: Document-relative full-page heatmaps and server-side daily rollups.

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

### Patch Changes

- Updated dependencies [eea0827]
  - react-clickmap@0.3.0

## 0.2.0

### Minor Changes

- Bug fixes and improvements from a full audit:

  - Fix: `"use client"` directive is now preserved in the built output of `react-clickmap` and `@react-clickmap/dashboard` (Next.js App Router / RSC compatibility)
  - Fix: WebGL contexts are created with `preserveDrawingBuffer: true`, so heatmap image export (`toDataUrl`/`toBlob`/`download`) no longer produces blank images
  - Fix: the WebGL renderer now honors custom `gradient` options via a gradient LUT texture (matching the Canvas renderer), including `ComparisonHeatmap` palettes
  - Fix: `capture={['dead-click']}` now works, and rage-click/dead-click-only capture no longer stores plain click events
  - Fix: `ClickmapProvider` no longer rebuilds the capture engine when inline array props (`capture`, `maskSelectors`, `ignoreSelectors`) are passed; `useHeatmapData` no longer refetches infinitely with inline `query` objects
  - Fix: `fetchAdapter` no longer silently drops custom headers by using `sendBeacon`; when headers are set it uses `fetch` with `keepalive`
  - Postgres adapter: batched multi-row inserts with transactions; init SQL now includes the same indexes as the shipped migration
  - Supabase adapter: honest `supportsAggregation: false`; `save()` chunks large batches
  - `@react-clickmap/postgres` and `@react-clickmap/supabase` no longer pull `react-clickmap` in as a runtime dependency (types only)
  - Removed dead worker/OffscreenCanvas code and unused CSS; docs updated to match

### Patch Changes

- Updated dependencies
  - react-clickmap@0.2.0
