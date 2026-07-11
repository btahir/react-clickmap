# @react-clickmap/postgres

Postgres persistence add-on for `react-clickmap`.

This package provides:

- Canonical SQL schema for clickmap event storage
- A zero-dependency Postgres adapter implementation
- Typed contracts for wiring your own SQL client (`pg`, Postgres.js, Neon, Supabase server client)

## Install

```bash
pnpm add @react-clickmap/postgres react-clickmap
```

## Apply schema

Run the migrations in order against your database:

1. [`sql/0001_init.sql`](./sql/0001_init.sql) — base event, session, rollup, and ingest tables.
2. [`sql/0002_document_coordinates.sql`](./sql/0002_document_coordinates.sql) — document-relative coordinate columns and coordinate-space-aware daily bins.

Both migrations are additive and safe to run on a database that already holds data. Existing rows keep loading unchanged. For a quick programmatic setup of just the events table you can also execute the exported `POSTGRES_INIT_SQL` string (note: it creates the events table only — run the SQL files for the rollup tables).

## Adapter usage

```ts
import { createPostgresAdapter } from "@react-clickmap/postgres";

const adapter = createPostgresAdapter({
  sql: {
    query: (text, params) => db.query(text, params),
  },
});
```

The adapter implements `save`, `load`, `deleteEvents`, and `loadAggregated`.

- `save()` batches events into parameterized multi-row `INSERT`s and wraps them in a transaction when a flush needs more than one statement.
- Inserts are idempotent via `ON CONFLICT (event_id) DO NOTHING`.
- `loadAggregated()` bins coordinates in SQL, so `supportsAggregation` is honestly `true`. It reads pre-computed daily bins (see below) for day-aligned ranges and falls back to aggregating raw events otherwise. Pass `coordinateSpace: "document"` in the query to aggregate the full-page (document-relative) heatmap; the default is `"viewport"`.
- This package doesn't depend on `react-clickmap` at runtime — it's a `peerDependency` used only for types.

### Document-relative coordinates

Migration 0002 adds `doc_x_pct`, `doc_y_pct`, `doc_w`, and `doc_h` to `clickmap_events`. These are populated automatically by the capture engine (v0.3+) and let you render full-page heatmaps with `<Heatmap coordinateSpace="document" />`. Rows written before 0002 leave them `NULL`; they are simply skipped when aggregating in document space.

**Filtering by device / breakpoint.** Every row already stores `device_type` (`desktop` / `tablet` / `mobile`) and the raw `viewport_w` / `viewport_h`. Filter a heatmap to a device class with the query's `device` field, or bucket by `viewport_w` directly in SQL for finer breakpoint analysis, e.g.:

```sql
SELECT width_bucket(viewport_w, ARRAY[480, 768, 1024, 1440]) AS bp, COUNT(*)
FROM clickmap_events
WHERE route_key = '/pricing'
GROUP BY bp;
```

## Server-side aggregation (daily rollups)

`rollupDaily()` aggregates a single UTC day of raw events into the
`clickmap_heatmap_bins_daily` and `clickmap_element_clicks_daily` tables. Both
`viewport` and `document` coordinate spaces are rolled up. It is **idempotent** —
it deletes the day's existing rollup rows (scoped to the same project/route
filters) and re-inserts them inside one transaction, so re-running a day is safe.

```ts
import { rollupDaily } from "@react-clickmap/postgres";

// Roll up the previous complete UTC day (the default).
await rollupDaily({ query: (text, params) => db.query(text, params) });

// Or a specific day / scope:
await rollupDaily(sql, { day: "2026-07-01", routeKey: "/pricing" });
```

Once a day is rolled up, `loadAggregated()` will serve day-aligned ranges from
the tiny bin tables instead of scanning raw events. To force raw aggregation,
construct the adapter with `preferDailyBins: false`.

### Running it on a schedule

Run the rollup once per day for the previous day. A few options:

**Node cron / scheduled function**

```ts
// e.g. a Vercel Cron route, a Cloud Scheduler target, or node-cron at 01:00 UTC
export async function handler() {
  await rollupDaily({ query: (text, params) => db.query(text, params) });
}
```

**Postgres `pg_cron`** — call a small wrapper that invokes your app endpoint, or
port the rollup SQL into a stored procedure and schedule it:

```sql
SELECT cron.schedule('clickmap-rollup', '0 1 * * *', $$ SELECT run_clickmap_rollup(current_date - 1) $$);
```

Backfilling history is just a loop over days calling `rollupDaily({ day })`.
