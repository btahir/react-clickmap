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

Run the SQL in [`sql/0001_init.sql`](./sql/0001_init.sql) against your database.

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
- `loadAggregated()` bins coordinates in SQL, so `supportsAggregation` is honestly `true`.
- This package doesn't depend on `react-clickmap` at runtime — it's a `peerDependency` used only for types.
