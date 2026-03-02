# Persistence Guide

react-clickmap doesn't care where you store events. The adapter interface has two required methods — `save()` and `load()` — and two optional ones. This guide walks through every built-in adapter and shows you how to set up database persistence from scratch.

## How adapters work

Every adapter implements this interface:

```ts
interface ClickmapAdapter {
  save(events: CaptureEvent[]): Promise<void>;
  load(query: HeatmapQuery): Promise<CaptureEvent[]>;
  deleteEvents?(query: HeatmapQuery): Promise<number>;
  loadAggregated?(query: HeatmapQuery): Promise<AggregatedHeatmapPayload>;
}
```

- **`save(events)`** — Called by the batcher when it flushes. Receives an array of events to persist.
- **`load(query)`** — Called by `<Heatmap>` and `useHeatmapData()` to fetch events for rendering.
- **`deleteEvents(query)`** — Optional. Used for data retention and GDPR/CCPA compliance.
- **`loadAggregated(query)`** — Optional. Returns pre-binned data for large datasets (avoids loading millions of raw events).

## The data flow

```
User interaction
    ↓
ClickmapProvider captures event
    ↓
EventBatcher queues it (flushes every 5s, or at 100 events, or on page exit)
    ↓
adapter.save([...events])  ← your persistence layer
    ↓
adapter.load(query)  ← Heatmap component fetches for rendering
    ↓
WebGL/Canvas renders the overlay
```

## Built-in adapters

### Memory adapter

Events live in memory. They're gone when the page refreshes. Use this for development and testing.

```ts
import { memoryAdapter } from "react-clickmap";

const adapter = memoryAdapter();

// Useful for tests:
adapter.inspect();  // returns all stored events
adapter.clear();    // wipes everything
```

### Local storage adapter

Events persist in the browser's localStorage. No server needed, but there's a ~5 MB limit and no cross-device sync.

```ts
import { localStorageAdapter } from "react-clickmap";

const adapter = localStorageAdapter({
  key: "my-clickmap-events",  // localStorage key (default: "clickmap_events")
  maxEvents: 5000,            // cap to prevent filling storage
});
```

### Fetch adapter

Sends events to your HTTP endpoint via POST. This is the standard production adapter — pair it with a server-side route that writes to your database.

```ts
import { fetchAdapter } from "react-clickmap";

const adapter = fetchAdapter({
  endpoint: "/api/clickmap",         // POST events here, GET events from here
  headers: { Authorization: "Bearer ..." },  // optional auth
});
```

**Reliability features:**

- Uses `navigator.sendBeacon()` when the user closes/navigates away (so events aren't lost)
- Falls back to `fetch()` with `keepalive: true` for large payloads
- Automatically splits batches that exceed 64 KB (the browser's keepalive limit)
- Retries failed events by re-queuing them in the next batch

**HTTP contract:**

| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/api/clickmap` | `CaptureEvent[]` | `{ ok: true, saved: N }` |
| `GET` | `/api/clickmap?page=/pricing&device=mobile` | — | `{ events: CaptureEvent[] }` |
| `DELETE` | `/api/clickmap?userId=user-123` | — | `{ ok: true, deleted: N }` |

## Database persistence: Postgres

This is the recommended production setup. The `react-clickmap-postgres` package provides a ready-made adapter with parameterized queries, idempotent inserts, and server-side aggregation.

### Step 1: Install

```bash
npm install react-clickmap-postgres
```

### Step 2: Create the table

Run this SQL in your database:

```sql
CREATE TABLE clickmap_events (
  event_id            TEXT PRIMARY KEY,
  project_id          TEXT NOT NULL,
  session_id          TEXT NOT NULL,
  user_id             TEXT,
  occurred_at         TIMESTAMPTZ NOT NULL,
  event_type          TEXT NOT NULL,
  page_path           TEXT NOT NULL,
  route_key           TEXT NOT NULL,
  device_type         TEXT NOT NULL,
  viewport_w          INTEGER NOT NULL,
  viewport_h          INTEGER NOT NULL,
  scroll_x            INTEGER NOT NULL DEFAULT 0,
  scroll_y            INTEGER NOT NULL DEFAULT 0,
  x_pct               DOUBLE PRECISION,
  y_pct               DOUBLE PRECISION,
  pointer_type        TEXT,
  selector_masked_path TEXT,
  depth_pct           DOUBLE PRECISION,
  max_depth_pct       DOUBLE PRECISION,
  is_rage_click       BOOLEAN NOT NULL DEFAULT false,
  is_dead_click       BOOLEAN NOT NULL DEFAULT false,
  payload_jsonb       JSONB DEFAULT '{}'::jsonb,
  schema_version      INTEGER NOT NULL DEFAULT 1
);

-- Recommended indexes for common query patterns
CREATE INDEX idx_clickmap_project_page ON clickmap_events (project_id, page_path);
CREATE INDEX idx_clickmap_occurred_at ON clickmap_events (occurred_at);
CREATE INDEX idx_clickmap_session ON clickmap_events (session_id);
CREATE INDEX idx_clickmap_event_type ON clickmap_events (event_type);
```

**Column reference:**

| Column | Type | Description |
|---|---|---|
| `event_id` | `TEXT PK` | Unique event ID generated client-side. Prevents duplicate inserts. |
| `project_id` | `TEXT` | Scopes events by project (e.g., `"my-app"`) |
| `session_id` | `TEXT` | Anonymous session identifier |
| `user_id` | `TEXT` | Optional authenticated user ID |
| `occurred_at` | `TIMESTAMPTZ` | When the event happened |
| `event_type` | `TEXT` | `click`, `dead-click`, `rage-click`, `scroll`, `pointer-move` |
| `page_path` | `TEXT` | URL pathname (e.g., `/pricing`) |
| `route_key` | `TEXT` | SPA route key (pathname + optional query string) |
| `device_type` | `TEXT` | `desktop`, `tablet`, or `mobile` |
| `viewport_w/h` | `INTEGER` | Viewport dimensions at capture time |
| `scroll_x/y` | `INTEGER` | Scroll position at capture time |
| `x_pct/y_pct` | `DOUBLE PRECISION` | Click/pointer coordinates as viewport percentages (0–100) |
| `pointer_type` | `TEXT` | `mouse`, `touch`, `pen`, or `unknown` |
| `depth_pct` | `DOUBLE PRECISION` | Current scroll depth (scroll events only) |
| `max_depth_pct` | `DOUBLE PRECISION` | Maximum scroll depth reached (scroll events only) |
| `is_rage_click` | `BOOLEAN` | Whether this is a rage-click event |
| `is_dead_click` | `BOOLEAN` | Whether this is a dead-click event |
| `payload_jsonb` | `JSONB` | Extra data (rage-click cluster info, dead-click reason) |

### Step 3: Create the adapter

The adapter accepts any object with a `query(text, params)` method. This works with `pg`, `postgres.js`, Drizzle's `$queryRaw`, Prisma's `$queryRawUnsafe`, or any Postgres client.

**With `pg` (node-postgres):**

```ts
import { Pool } from "pg";
import { createPostgresAdapter } from "react-clickmap-postgres";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const adapter = createPostgresAdapter({ sql: pool });
```

**With `postgres` (postgres.js):**

```ts
import postgres from "postgres";
import { createPostgresAdapter } from "react-clickmap-postgres";

const sql = postgres(process.env.DATABASE_URL);

// postgres.js uses tagged templates, so wrap it in the expected interface:
const adapter = createPostgresAdapter({
  sql: {
    async query(text, params) {
      const rows = await sql.unsafe(text, params as any[]);
      return { rows, rowCount: rows.length };
    },
  },
});
```

**With Drizzle:**

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { createPostgresAdapter } from "react-clickmap-postgres";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const adapter = createPostgresAdapter({
  sql: {
    async query(text, params) {
      const result = await pool.query(text, params as any[]);
      return { rows: result.rows, rowCount: result.rowCount };
    },
  },
});
```

### Step 4: Wire it up with an API route

The adapter runs on your server. Your client uses `fetchAdapter` to talk to it over HTTP. Here's a minimal Express example:

```ts
// server.ts
import express from "express";
import { Pool } from "pg";
import { createPostgresAdapter } from "react-clickmap-postgres";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = createPostgresAdapter({ sql: pool });

const app = express();
app.use(express.json());

// Save events
app.post("/api/clickmap", async (req, res) => {
  const events = Array.isArray(req.body) ? req.body : req.body.events ?? [];
  await adapter.save(events);
  res.json({ ok: true, saved: events.length });
});

// Load events
app.get("/api/clickmap", async (req, res) => {
  const events = await adapter.load({
    page: req.query.page as string,
    device: req.query.device as any,
    from: req.query.from ? Number(req.query.from) : undefined,
    to: req.query.to ? Number(req.query.to) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });
  res.json({ events });
});

// Delete events (for GDPR/CCPA)
app.delete("/api/clickmap", async (req, res) => {
  const deleted = await adapter.deleteEvents?.({
    userId: req.query.userId as string,
    projectId: req.query.projectId as string,
  });
  res.json({ ok: true, deleted });
});

app.listen(3001);
```

```tsx
// client.tsx
import { ClickmapProvider, Heatmap, fetchAdapter } from "react-clickmap";

const adapter = fetchAdapter({ endpoint: "http://localhost:3001/api/clickmap" });

function App() {
  return (
    <ClickmapProvider adapter={adapter} projectId="my-app" capture={["click", "scroll"]}>
      <YourApp />
      <Heatmap adapter={adapter} page="/pricing" type="heatmap" />
    </ClickmapProvider>
  );
}
```

**For Next.js, skip the Express boilerplate** — use `@react-clickmap/next` which gives you pre-built route handlers. See the [Next.js guide](/docs/guides/nextjs-app-router).

### Idempotency

Every event has a unique `eventId` generated client-side. The Postgres adapter uses `ON CONFLICT (event_id) DO NOTHING`, so duplicate events from retries or `sendBeacon` + `fetch` fallback are automatically deduplicated.

### Custom table name

```ts
const adapter = createPostgresAdapter({
  sql: pool,
  tableName: "my_custom_events",  // default: "clickmap_events"
});
```

Table names are validated against `[a-zA-Z_][a-zA-Z0-9_]*` to prevent SQL injection.

## Database persistence: Supabase

If you use Supabase, the `react-clickmap-supabase` adapter talks directly to the PostgREST API. No custom backend code needed — your client can save and load events directly.

### Step 1: Install

```bash
npm install react-clickmap-supabase
```

### Step 2: Create the table

In the Supabase SQL editor, run the same schema as above (see the Postgres section). Alternatively, use the Supabase Table Editor to create `clickmap_events` with the same columns.

### Step 3: Set up Row Level Security

Since the client talks directly to Supabase, you need RLS policies:

```sql
-- Enable RLS
ALTER TABLE clickmap_events ENABLE ROW LEVEL SECURITY;

-- Allow inserts from authenticated or anon users
CREATE POLICY "Allow insert" ON clickmap_events
  FOR INSERT WITH CHECK (true);

-- Allow reads (restrict as needed)
CREATE POLICY "Allow read" ON clickmap_events
  FOR SELECT USING (true);

-- Allow deletes scoped to project
CREATE POLICY "Allow scoped delete" ON clickmap_events
  FOR DELETE USING (project_id IS NOT NULL);
```

Adjust these policies to match your security requirements.

### Step 4: Create the adapter

```ts
import { createSupabaseAdapter } from "react-clickmap-supabase";

const adapter = createSupabaseAdapter({
  url: "https://your-project.supabase.co",
  anonKey: "your-anon-key",
});
```

### Step 5: Use it directly on the client

```tsx
import { ClickmapProvider, Heatmap } from "react-clickmap";
import { createSupabaseAdapter } from "react-clickmap-supabase";

const adapter = createSupabaseAdapter({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
});

function App() {
  return (
    <ClickmapProvider adapter={adapter} projectId="my-app" capture={["click", "scroll"]}>
      <YourApp />
      <Heatmap adapter={adapter} page="/pricing" type="heatmap" />
    </ClickmapProvider>
  );
}
```

No API route needed — the adapter handles everything via the Supabase REST API.

### Supabase adapter options

| Option | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | required | Your Supabase project URL |
| `anonKey` | `string` | required | Your Supabase anon/public key |
| `table` | `string` | `"clickmap_events"` | Table name |
| `schema` | `string` | — | Custom schema (if not using `public`) |
| `fetchImpl` | `typeof fetch` | `globalThis.fetch` | Custom fetch implementation |

## Building a custom adapter

If you use a database that's not Postgres (e.g., MongoDB, DynamoDB, SQLite), implement the adapter interface directly:

```ts
import { createAdapter, type CaptureEvent, type HeatmapQuery } from "react-clickmap";

const adapter = createAdapter({
  async save(events: CaptureEvent[]) {
    // Write events to your database
    await db.collection("clickmap_events").insertMany(events);
  },

  async load(query: HeatmapQuery) {
    // Build a query from the filter parameters
    const filter: any = {};

    if (query.page) filter.pathname = query.page;
    if (query.device && query.device !== "all") filter.deviceType = query.device;
    if (query.sessionId) filter.sessionId = query.sessionId;
    if (query.projectId) filter.projectId = query.projectId;

    if (query.from || query.to) {
      filter.timestamp = {};
      if (query.from) filter.timestamp.$gte = query.from;
      if (query.to) filter.timestamp.$lte = query.to;
    }

    const cursor = db.collection("clickmap_events").find(filter).sort({ timestamp: 1 });

    if (query.limit) cursor.limit(query.limit);

    return await cursor.toArray();
  },

  // Optional: implement for data retention and compliance
  async deleteEvents(query: HeatmapQuery) {
    const filter: any = {};
    if (query.userId) filter.userId = query.userId;
    if (query.projectId) filter.projectId = query.projectId;

    const result = await db.collection("clickmap_events").deleteMany(filter);
    return result.deletedCount;
  },
});
```

## Query parameters

Both `load()` and `deleteEvents()` receive a `HeatmapQuery` object:

```ts
interface HeatmapQuery {
  page?: string;                          // filter by pathname
  routeKey?: string;                      // filter by SPA route key
  sessionId?: string;                     // filter by session
  projectId?: string;                     // filter by project
  userId?: string;                        // filter by user
  device?: "all" | "desktop" | "tablet" | "mobile";
  types?: CaptureType[];                  // filter by event type
  from?: number;                          // timestamp >= (milliseconds)
  to?: number;                            // timestamp <= (milliseconds)
  limit?: number;                         // max results
}
```

## Data retention

Recommended retention windows:

| Data | Retention | Reasoning |
|---|---|---|
| Raw events | 30–90 days | High volume, useful for recent analysis |
| Daily aggregates | 12–18 months | Trend analysis over time |
| Session metadata | 30–90 days | Session replay correlation |

Implement retention at the database layer with a scheduled job:

```sql
-- Delete raw events older than 90 days
DELETE FROM clickmap_events
WHERE occurred_at < NOW() - INTERVAL '90 days';
```

Or use `deleteEvents()` programmatically:

```ts
const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
await adapter.deleteEvents?.({
  projectId: "my-app",
  to: ninetyDaysAgo,
});
```

## GDPR / CCPA compliance

To delete a specific user's data:

```ts
await adapter.deleteEvents?.({
  projectId: "my-app",
  userId: "user-123",
});
```

Always include `projectId` in delete queries to prevent accidental broad wipes. The Postgres adapter requires at least one filter parameter and will throw if you pass an empty query.
