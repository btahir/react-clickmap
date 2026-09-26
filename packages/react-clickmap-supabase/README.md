# @react-clickmap/supabase

Supabase adapter add-on for `react-clickmap`.

This package uses Supabase PostgREST endpoints (no SDK dependency required) and implements the
`ClickmapAdapter` contract:

- `save`
- `load`
- `deleteEvents`
- `loadAggregated`

## Install

```bash
pnpm add react-clickmap @react-clickmap/supabase
```

## Usage

```ts
import { createSupabaseAdapter } from "@react-clickmap/supabase";

const adapter = createSupabaseAdapter({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  table: "clickmap_events",
});
```

`save()` chunks large batches to stay under PostgREST's request size limits. `loadAggregated()` fetches raw rows and reduces them client-side rather than binning in SQL, so the adapter reports `supportsAggregation: false` — reach for `@react-clickmap/postgres` if you need real server-side aggregation over large datasets.

This package doesn't depend on `react-clickmap` at runtime — it's a `peerDependency` used only for types.

## Schema

Your `clickmap_events` table mirrors the `@react-clickmap/postgres` schema. To
support full-page (document-relative) heatmaps, add the document coordinate
columns (equivalent to migration `0002`):

```sql
alter table clickmap_events
  add column if not exists doc_x_pct double precision,
  add column if not exists doc_y_pct double precision,
  add column if not exists doc_w integer,
  add column if not exists doc_h integer;
```

These are additive and nullable — existing rows keep working, and the capture
engine (v0.3+) populates them automatically. Render a full-page heatmap with
`<Heatmap coordinateSpace="document" />`. Filter by device class with the
query's `device` field (`device_type` is stored on every row) or bucket by the
stored `viewport_w` for finer breakpoint analysis.

## Server-side aggregation (optional)

This adapter aggregates client-side by design. If you outgrow that, the daily
rollup pattern from `@react-clickmap/postgres` translates directly to Supabase:
create the `clickmap_heatmap_bins_daily` / `clickmap_element_clicks_daily`
tables (see the postgres package's `sql/0001_init.sql` + `sql/0002_document_coordinates.sql`)
and schedule a rollup with `pg_cron`. A minimal Postgres function you can
schedule:

```sql
create or replace function clickmap_rollup_day(target date)
returns void language sql as $$
  delete from clickmap_heatmap_bins_daily where day = target;
  insert into clickmap_heatmap_bins_daily
    (day, project_id, route_key, page_path, device_type, coordinate_space, x_bucket, y_bucket, value, ref_w, ref_h)
  select target, project_id, route_key, page_path, device_type, 'viewport',
         round(x_pct)::smallint, round(y_pct)::smallint,
         sum(case when is_rage_click then 2 else 1 end), max(viewport_w), max(viewport_h)
  from clickmap_events
  where occurred_at >= target and occurred_at < target + 1
    and x_pct is not null and y_pct is not null
  group by project_id, route_key, page_path, device_type, round(x_pct), round(y_pct);
  -- repeat the insert with doc_x_pct/doc_y_pct/doc_w/doc_h and 'document' for full-page bins.
$$;

select cron.schedule('clickmap-rollup', '0 1 * * *', $$ select clickmap_rollup_day(current_date - 1) $$);
```

## Complete reads and access

Reads traverse deterministic `occurred_at,event_id` pages using Content-Range totals. Missing totals, inconsistent empty pages, or an exceeded read ceiling fail rather than returning a silently partial aggregate. `maxReadEvents` bounds the total; narrow the query when exceeded. Supabase aggregation remains client-side.

Use an authorized server endpoint for admin reads/deletes. If exposing a table through the Data API, enable RLS and define project ownership policies; an anon key is not authorization. Never expose a service-role/secret key in the browser. The adapter does not create policies or infer tenancy for you.

## Support this project

[React Maintainer Support](https://react-tourlight.vercel.app/support) helps maintain Tourlight, Kino, Clickmap, and Redact. All features remain MIT licensed; support is optional, with recurring and one-time options.
