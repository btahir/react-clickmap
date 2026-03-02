# Adapters API

## `ClickmapAdapter` interface

Every adapter implements this interface. `save` and `load` are required; `deleteEvents` and `loadAggregated` are optional.

```ts
interface ClickmapAdapter {
  capabilities?: AdapterCapabilities;
  save(events: CaptureEvent[]): Promise<void>;
  load(query: HeatmapQuery): Promise<CaptureEvent[]>;
  deleteEvents?(query: HeatmapQuery): Promise<number>;
  loadAggregated?(query: HeatmapQuery): Promise<AggregatedHeatmapPayload>;
}

interface AdapterCapabilities {
  supportsAggregation: boolean;   // Has loadAggregated()
  supportsRetention: boolean;     // Can delete old data
  supportsIdempotency: boolean;   // Deduplicates by eventId
}
```

### `save(events)`

Called by the event batcher when it flushes. Receives an array of `CaptureEvent` objects.

- **Must be idempotent** if the adapter declares `supportsIdempotency`. The same event (by `eventId`) may be sent more than once due to retry logic or `sendBeacon` + `fetch` fallback.
- The array may be empty — adapters should handle this gracefully (no-op).

### `load(query)`

Called by the `<Heatmap>` component and the `useHeatmapData()` hook to fetch events for rendering.

- Should return events sorted by `timestamp` ascending.
- Should respect all filters in the `HeatmapQuery` (see below).

### `deleteEvents(query)` (optional)

Used for GDPR/CCPA compliance and data retention. Returns the number of deleted events.

- Should require at least one filter to prevent accidental full-table deletes.

### `loadAggregated(query)` (optional)

Returns pre-binned coordinate data for large datasets. This avoids loading millions of raw events to the client.

```ts
interface AggregatedHeatmapPayload {
  width: number;      // viewport width used for rendering
  height: number;     // viewport height used for rendering
  bins: AggregatedBin[];
  totalEvents: number;
}

interface AggregatedBin {
  x: number;    // viewport percentage (0–100)
  y: number;    // viewport percentage (0–100)
  value: number; // weight (rage clicks count as 2)
}
```

## `HeatmapQuery`

The query object passed to `load()`, `deleteEvents()`, and `loadAggregated()`:

```ts
interface HeatmapQuery {
  page?: string;                                    // pathname filter (e.g., "/pricing")
  routeKey?: string;                                // SPA route key
  sessionId?: string;                               // session filter
  projectId?: string;                               // project filter
  userId?: string;                                   // user filter
  device?: "all" | "desktop" | "tablet" | "mobile"; // device filter
  types?: CaptureType[];                             // event type filter
  from?: number;                                     // timestamp >= (ms since epoch)
  to?: number;                                       // timestamp <= (ms since epoch)
  limit?: number;                                    // max results
}
```

## Built-in adapters

### `memoryAdapter(seedEvents?)`

In-memory event storage. Events are lost on page refresh.

```ts
import { memoryAdapter } from "react-clickmap";

const adapter = memoryAdapter();

// Development helpers:
adapter.inspect();  // CaptureEvent[] — view all stored events
adapter.clear();    // void — wipe all events
```

**Capabilities:** `{ supportsAggregation: false, supportsRetention: false, supportsIdempotency: false }`

### `localStorageAdapter(options?)`

Persists events to browser localStorage. Falls back to `memoryAdapter` when localStorage is unavailable (e.g., SSR).

```ts
import { localStorageAdapter } from "react-clickmap";

const adapter = localStorageAdapter({
  key: "my_events",    // localStorage key (default: "clickmap_events")
  maxEvents: 5000,     // cap stored events
});
```

**Capabilities:** `{ supportsAggregation: false, supportsRetention: false, supportsIdempotency: false }`

### `fetchAdapter(options)`

HTTP transport adapter. Sends events to your API endpoint. This is the standard production adapter on the client side.

```ts
import { fetchAdapter } from "react-clickmap";

const adapter = fetchAdapter({
  endpoint: "/api/clickmap",
  headers: { Authorization: "Bearer token" },
  preferBeacon: true,       // use sendBeacon on page exit (default: true)
  keepalive: true,          // use fetch keepalive (default: true)
  maxPayloadBytes: 65536,   // split batches above this size
});
```

**Capabilities:** `{ supportsAggregation: false, supportsRetention: false, supportsIdempotency: false }`

**Reliability:** Attempts `sendBeacon` first for page-exit events, falls back to `fetch` with `keepalive`, and automatically splits payloads that exceed the keepalive byte limit.

### `createAdapter(implementation)`

Convenience wrapper for creating a custom adapter from a plain object:

```ts
import { createAdapter } from "react-clickmap";

const adapter = createAdapter({
  save: async (events) => { /* ... */ },
  load: async (query) => { /* ... */ },
  deleteEvents: async (query) => { /* ... */ },
});
```

## Add-on adapters

### `createPostgresAdapter(options)` — `react-clickmap-postgres`

```bash
npm install react-clickmap-postgres
```

```ts
import { createPostgresAdapter } from "react-clickmap-postgres";

const adapter = createPostgresAdapter({
  sql: pool,                    // any { query(text, params) => { rows, rowCount } }
  tableName: "clickmap_events", // default
});
```

**Capabilities:** `{ supportsAggregation: true, supportsRetention: true, supportsIdempotency: true }`

Uses `ON CONFLICT (event_id) DO NOTHING` for idempotent inserts. Supports server-side coordinate binning via `loadAggregated()`.

See the [Persistence Guide](../guides/persistence.md) for the full SQL schema and setup instructions.

### `createSupabaseAdapter(options)` — `react-clickmap-supabase`

```bash
npm install react-clickmap-supabase
```

```ts
import { createSupabaseAdapter } from "react-clickmap-supabase";

const adapter = createSupabaseAdapter({
  url: "https://your-project.supabase.co",
  anonKey: "your-anon-key",
  table: "clickmap_events",  // default
  schema: "public",          // default
});
```

**Capabilities:** `{ supportsAggregation: true, supportsRetention: true, supportsIdempotency: true }`

Communicates via the Supabase REST API (PostgREST). Uses the `Prefer: resolution=ignore-duplicates` header for idempotent inserts.

### `createNextFetchAdapter(options)` — `@react-clickmap/next`

```bash
npm install @react-clickmap/next
```

```ts
import { createNextFetchAdapter } from "@react-clickmap/next";

const adapter = createNextFetchAdapter({
  endpoint: "/api/clickmap",  // default
});
```

Convenience wrapper around `fetchAdapter` with Next.js defaults. See the [Next.js guide](../guides/nextjs-app-router.md) for usage with `createClickmapRouteHandlers`.

## `useHeatmapData` hook

React hook that loads events from an adapter:

```tsx
import { useHeatmapData } from "react-clickmap";

function MyDashboard() {
  const { data, isLoading, error, reload } = useHeatmapData(adapter, {
    page: "/pricing",
    device: "desktop",
    from: Date.now() - 7 * 24 * 60 * 60 * 1000,  // last 7 days
  });

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return <p>{data.length} events loaded</p>;
}
```

| Return | Type | Description |
|---|---|---|
| `data` | `CaptureEvent[]` | Loaded events (empty array while loading) |
| `isLoading` | `boolean` | Whether a load is in progress |
| `error` | `Error \| null` | Error from the most recent load |
| `reload` | `() => void` | Manually trigger a re-fetch |
