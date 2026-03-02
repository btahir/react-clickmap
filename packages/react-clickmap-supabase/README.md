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
