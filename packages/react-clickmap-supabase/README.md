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
