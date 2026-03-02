# Add-on Packages

react-clickmap ships first-party add-on packages for common integrations. The core library stays lightweight — install only what you need.

## `@react-clickmap/next`

Next.js App Router integration.

```bash
npm install @react-clickmap/next
```

### What it provides

| Export | Description |
|---|---|
| `createNextFetchAdapter()` | Client-side adapter with Next.js defaults (`/api/clickmap` endpoint) |
| `createClickmapRouteHandlers()` | Pre-built `GET`/`POST`/`DELETE`/`OPTIONS` route handlers for your API route |
| `useNextRouteKey()` | Hook that tracks the current route via `history.pushState` patching |

### Quick setup

```ts
// app/api/clickmap/route.ts
import { createClickmapRouteHandlers } from "@react-clickmap/next";
import { createPostgresAdapter } from "react-clickmap-postgres";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const { GET, POST, DELETE, OPTIONS } = createClickmapRouteHandlers(
  createPostgresAdapter({ sql: pool })
);
```

```tsx
// app/providers.tsx
"use client";
import { ClickmapProvider } from "react-clickmap";
import { createNextFetchAdapter } from "@react-clickmap/next";

const adapter = createNextFetchAdapter();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClickmapProvider adapter={adapter} projectId="my-app" capture={["click", "scroll"]}>
      {children}
    </ClickmapProvider>
  );
}
```

See the full [Next.js App Router guide](/docs/guides/nextjs-app-router) for detailed setup instructions.

## `react-clickmap-postgres`

Direct Postgres persistence with parameterized queries.

```bash
npm install react-clickmap-postgres
```

### What it provides

| Export | Description |
|---|---|
| `createPostgresAdapter()` | Adapter that reads/writes to a Postgres table via `SqlExecutor` |

### Key features

- **Idempotent inserts** — `ON CONFLICT (event_id) DO NOTHING` prevents duplicates
- **Server-side aggregation** — `loadAggregated()` bins coordinates in SQL for large datasets
- **Parameterized queries** — All values are parameterized (`$1`, `$2`, ...) to prevent SQL injection
- **Custom table name** — Validated against `[a-zA-Z_][a-zA-Z0-9_]*` for safety
- **Works with any Postgres client** — Accepts any object with `query(text, params)` (pg, postgres.js, Drizzle, etc.)

See the [Persistence Guide](/docs/guides/persistence) for the full SQL schema and client-specific setup.

## `react-clickmap-supabase`

Supabase REST API adapter. No custom backend code needed.

```bash
npm install react-clickmap-supabase
```

### What it provides

| Export | Description |
|---|---|
| `createSupabaseAdapter()` | Adapter that talks to Supabase's PostgREST API |

### Key features

- **Direct client-to-Supabase** — No API route needed; the client saves/loads events directly
- **Idempotent inserts** — Uses `Prefer: resolution=ignore-duplicates` header
- **Custom schema support** — Set `schema` option for non-`public` schemas
- **RLS compatible** — Works with Row Level Security policies

### Quick setup

```tsx
import { createSupabaseAdapter } from "react-clickmap-supabase";

const adapter = createSupabaseAdapter({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
});
```

## `@react-clickmap/dashboard`

Pre-built analytics dashboard components.

```bash
npm install @react-clickmap/dashboard
```

### What it provides

- **KPI cards** — Total events, rage rate, dead-click rate, scroll depth
- **Event distribution panels** — Breakdown by event type
- **Device mix** — Desktop/tablet/mobile distribution with ratios
- **Top pages** — Most-viewed pages sorted by event count
- **Hourly activity** — 24-hour timeline of event volume
- **Dashboard snapshot builder** — `buildDashboardSnapshot(events)` computes all metrics from raw events

### Usage

```tsx
import { buildDashboardSnapshot } from "@react-clickmap/dashboard";

const events = await adapter.load({ projectId: "my-app" });
const snapshot = buildDashboardSnapshot(events);

console.log(snapshot.totalEvents);      // 45892
console.log(snapshot.rageRate);         // 0.032
console.log(snapshot.deadRate);         // 0.014
console.log(snapshot.averageScrollDepth); // 71.2
console.log(snapshot.uniqueSessions);   // 3241
console.log(snapshot.topPages);         // [{ pathname: "/pricing", count: 12340 }, ...]
console.log(snapshot.deviceMix);        // [{ device: "desktop", count: 30201, ratio: 0.66 }, ...]
console.log(snapshot.timeline);         // [{ hour: "00:00", count: 120 }, ...]
```

## `react-clickmap-cli`

Local development preview tool.

```bash
npx react-clickmap-cli --port 3334
```

### What it provides

- **Self-hosted API** at `/api/clickmap` — accepts the same HTTP contract as `fetchAdapter`
- **Browser dashboard** — Live event metrics and canvas-rendered heatmap preview
- **File-backed storage** — Events persist to a local JSON file for replay
- **Zero config** — Just run the CLI and point your `fetchAdapter` at it

### Usage for development

1. Start the CLI:
   ```bash
   npx react-clickmap-cli --port 3334
   ```

2. Point your adapter at it:
   ```ts
   const adapter = fetchAdapter({ endpoint: "http://localhost:3334/api/clickmap" });
   ```

3. Open `http://localhost:3334` to see the dashboard

This lets you develop and test heatmap features without setting up a database.
