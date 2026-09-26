# Persistence and self-hosting

Clickmap stores events through your adapter. A database adapter is a persistence primitive, not an authorization boundary.

## Choose a source

| Source | Appropriate use | Limits |
| --- | --- | --- |
| `memoryAdapter()` | Demos, ephemeral fixtures | Erased on reload |
| `localStorageAdapter()` | A single browser's local experiments | 100,000 record ceiling; no cross-tab transaction guarantee |
| Local CLI file | Local development event inbox | Loopback, one process, 100,000 records; token-protected reads/deletes |
| Your HTTP endpoint | Production collection and authorized inspection | You own authentication, request limits and operations |
| Postgres adapter | Durable storage and SQL aggregation | You manage migrations, backups, retention and access |
| Supabase adapter | REST persistence | RLS/server authorization required; aggregation loads verified rows into memory |

## Postgres

```sh
npm install @react-clickmap/postgres pg
```

Apply the complete schema in a controlled migration:

```ts
import {Pool} from 'pg';
import {POSTGRES_INIT_SQL,createPostgresAdapter,rollupDaily} from '@react-clickmap/postgres';
const pool=new Pool({connectionString:process.env.DATABASE_URL});
await pool.query(POSTGRES_INIT_SQL); // migration step; not every request
const adapter=createPostgresAdapter({sql:pool});
```

Pools expose `connect()`. The adapter checks out a client per operation so multi-statement transactions stay on the same connection. If supplying a custom executor, its query calls must share one dedicated connection for the duration of a transaction. Do not wrap `pool.query` alone and discard `connect()`.

Use the [authorized Next.js endpoint](./nextjs-app-router) or adapt those boundaries to your framework: validated events, bounded bytes and batches, server-owned project identity, independent authorized read/delete access, explicit origins and ingestion rate limits. Never copy an unprotected CRUD endpoint into production.

## Queries and layout identity

Queries support project, page, route, session, user, device, types, layout revision and viewport width bounds. Time windows use `from <= timestamp < to`. A query limit is a safety bound, not evidence that a returned sample contains the full population. Prefer a narrow cohort and show its coverage.

`layoutId` is stored in the existing payload JSON column; no extra migration is needed for it. Keep stable target IDs and route names free of personal identifiers.

## Rollups

Raw SQL aggregation is the default. Daily rollups are an explicit optimization for fully processed historical days:

```ts
await rollupDaily(pool,{day:'2026-09-24',projectId:'my-app'});
const historical=createPostgresAdapter({sql:pool,preferDailyBins:true});
```

Rollups use one connection and a shared day-level advisory lock, so overlapping project/route rollups serialize safely. Rollup reads only support day-aligned ranges and compatible coarse filters; layout, viewport, user, session and type filters use raw rows. You are responsible for complete rollup coverage before enabling the optimization. An empty rollup result falls back to raw rows.

Deleting raw events atomically invalidates affected projects' heatmap and element bins. Reads fall back to surviving raw records until you rebuild bins. Preserve raw records if recomputation is required. Bin `value` is weighted intensity; `totalEvents` counts actual coordinate-bearing records.

## Supabase

The adapter uses PostgREST without an SDK. Use a protected server route for administrative operations, or design and test RLS policies that match project ownership. Merely possessing an anon/publishable key does not grant legitimate access to all projects. Never place a service-role/secret key in client code.

Loads paginate by `occurred_at,event_id`, verify Content-Range totals, and fail if a configured ceiling is exceeded or completeness cannot be verified. `maxReadEvents` limits memory use. This adapter's aggregation is intentionally client-side; use Postgres SQL aggregation for large datasets.

## Retention and recovery

The Studio Delete scoped events control requires a page or time cohort and a confirmation. The server enforces authorization and rejects whole-project deletion without narrower scope. CLI retention uses `prune --before ISO_DATE` as a dry run, adding `--apply` only after reviewing the matched count. Protect and back up your database separately.

Local JSON writes are atomic, events are deduplicated by ID, and corrupt input causes an error instead of silently resetting data. The localStorage adapter also surfaces parse/quota errors. These are local development tools, not substitutes for a production database.

A runnable Postgres + Next.js application is included in `apps/self-hosted`. Its README explains startup, configuration, capture consent, admin access, and deployment limits.
