# @react-clickmap/cli

## 0.2.0

### Minor Changes

- Add an app-embedded Clickmap Studio with real capture diagnostics, cohort filters, target inspection, guarded overlays, and portable versioned JSON/Markdown/CSV/PNG evidence. Ship local deterministic evidence validation/reporting tools and a self-hosted Next/Postgres example.

  Harden ingestion, project boundaries and authenticated reads/deletes; preserve route privacy and stable target/layout identity. Correct session-route-revision scroll denominators, bounded Supabase pagination, Postgres pool transactions and rollup invalidation/coverage. Time queries now use inclusive `from` and exclusive `to`. Existing Next handler consumers must provide a server-owned project and read/delete authorization.

  Update package and site documentation with explicit measurement/privacy limits, server/client entry guidance, discovery files and shared maintainer support.

### Patch Changes

- Updated dependencies
  - react-clickmap@0.4.0

## 0.1.2

### Patch Changes

- Updated dependencies [eea0827]
  - react-clickmap@0.3.0

## 0.1.1

### Patch Changes

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

- Updated dependencies
  - react-clickmap@0.2.0
