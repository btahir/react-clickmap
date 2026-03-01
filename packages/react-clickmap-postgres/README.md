# react-clickmap-postgres

Postgres persistence add-on for `react-clickmap`.

This package provides:

- Canonical SQL schema for clickmap event storage
- A zero-dependency Postgres adapter implementation
- Typed contracts for wiring your own SQL client (`pg`, Postgres.js, Neon, Supabase server client)

## Install

```bash
pnpm add react-clickmap-postgres react-clickmap
```

## Apply schema

Run the SQL in [`sql/0001_init.sql`](./sql/0001_init.sql) against your database.

## Adapter usage

```ts
import { createPostgresAdapter } from "react-clickmap-postgres";

const adapter = createPostgresAdapter({
  sql: {
    query: (text, params) => db.query(text, params),
  },
});
```

The adapter implements `save`, `load`, `deleteEvents`, and `loadAggregated`.
