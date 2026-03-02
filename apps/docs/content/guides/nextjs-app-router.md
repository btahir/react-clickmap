# Next.js App Router Integration

This guide shows how to set up react-clickmap in a Next.js App Router project, from installation to a working heatmap overlay with database persistence.

## Install

```bash
npm install react-clickmap @react-clickmap/next
```

For database persistence, also install an adapter:

```bash
npm install react-clickmap-postgres   # if using Postgres
# or
npm install react-clickmap-supabase   # if using Supabase
```

## Project structure

Here's what the integration looks like in a typical Next.js project:

```
app/
├── api/
│   └── clickmap/
│       └── route.ts          ← API route (server-side)
├── layout.tsx
├── providers.tsx              ← ClickmapProvider (client component)
├── page.tsx
└── pricing/
    └── page.tsx               ← Heatmap overlay here
```

## Step 1: Create the API route

The `@react-clickmap/next` package provides pre-built route handlers. You just pass in your adapter.

**With Postgres:**

```ts
// app/api/clickmap/route.ts
import { createClickmapRouteHandlers } from "@react-clickmap/next";
import { createPostgresAdapter } from "react-clickmap-postgres";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = createPostgresAdapter({ sql: pool });

export const { GET, POST, DELETE, OPTIONS } = createClickmapRouteHandlers(adapter);
```

**With Supabase (no API route needed):**

If you use the Supabase adapter, the client talks directly to Supabase's REST API — skip this step entirely.

**With the memory adapter (for development):**

```ts
// app/api/clickmap/route.ts
import { createClickmapRouteHandlers } from "@react-clickmap/next";
import { memoryAdapter } from "react-clickmap";

const adapter = memoryAdapter();

export const { GET, POST, DELETE, OPTIONS } = createClickmapRouteHandlers(adapter);
```

### What the route handlers do

| Method | Action |
|---|---|
| `POST /api/clickmap` | Receives event batches from the client and calls `adapter.save()` |
| `GET /api/clickmap?page=/pricing` | Loads events for rendering and calls `adapter.load()` |
| `DELETE /api/clickmap?userId=abc` | Deletes matching events (GDPR/CCPA) via `adapter.deleteEvents()` |
| `OPTIONS /api/clickmap` | CORS preflight response |

### CORS configuration

If your frontend and API are on different origins:

```ts
export const { GET, POST, DELETE, OPTIONS } = createClickmapRouteHandlers(adapter, {
  cors: {
    origin: "https://my-app.com",
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    headers: ["content-type", "authorization"],
    maxAgeSeconds: 3600,
  },
});
```

### Error handling

```ts
export const { GET, POST, DELETE, OPTIONS } = createClickmapRouteHandlers(adapter, {
  onError: (error, request) => {
    console.error("Clickmap API error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  },
});
```

## Step 2: Create the client provider

react-clickmap components use browser APIs, so they must run in client components.

```tsx
// app/providers.tsx
"use client";

import { ClickmapProvider } from "react-clickmap";
import { createNextFetchAdapter } from "@react-clickmap/next";

// createNextFetchAdapter is a convenience wrapper around fetchAdapter
// with sensible Next.js defaults (endpoint: "/api/clickmap")
const adapter = createNextFetchAdapter();

export function ClickmapClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClickmapProvider
      adapter={adapter}
      projectId="my-app"
      capture={["click", "scroll", "rage-click", "dead-click"]}
      sampleRate={0.25}
      respectDoNotTrack
      respectGlobalPrivacyControl
    >
      {children}
    </ClickmapProvider>
  );
}

export { adapter };
```

## Step 3: Add the provider to your layout

```tsx
// app/layout.tsx
import { ClickmapClientProvider } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClickmapClientProvider>
          {children}
        </ClickmapClientProvider>
      </body>
    </html>
  );
}
```

## Step 4: Render a heatmap

```tsx
// app/pricing/page.tsx
"use client";

import { Heatmap } from "react-clickmap";
import { adapter } from "../providers";

export default function PricingPage() {
  return (
    <>
      <PricingContent />

      {/* Overlay a heatmap on this page */}
      <Heatmap
        adapter={adapter}
        page="/pricing"
        type="heatmap"
        radius={25}
        opacity={0.6}
      />
    </>
  );
}
```

## Route key tracking

Next.js uses client-side navigation, which means `window.location.pathname` doesn't update on route changes. The `useNextRouteKey` hook tracks the current route by patching `history.pushState` and `history.replaceState`:

```tsx
"use client";

import { useNextRouteKey } from "@react-clickmap/next";

function MyComponent() {
  const routeKey = useNextRouteKey();
  // routeKey = "/pricing" or "/pricing?plan=pro" (includes query string by default)

  return <div>Current route: {routeKey}</div>;
}
```

Options:

```tsx
const routeKey = useNextRouteKey({
  includeSearch: false,     // exclude query string (default: true)
  fallbackPathname: "/",    // used during SSR (default: "/")
});
```

The core `ClickmapProvider` already handles route tracking internally — you only need `useNextRouteKey` if you want to access the current route key in your own components.

## `createNextFetchAdapter` options

| Option | Type | Default | Description |
|---|---|---|---|
| `endpoint` | `string` | `"/api/clickmap"` | API route path |
| `loadEndpoint` | `string` | same as `endpoint` | Separate endpoint for loading events |
| `deleteEndpoint` | `string` | same as `loadEndpoint` | Separate endpoint for deleting events |
| `headers` | `HeadersInit` | — | Custom headers (e.g., auth tokens) |
| `preferBeacon` | `boolean` | `true` | Use sendBeacon for page-exit reliability |
| `keepalive` | `boolean` | `true` | Use fetch keepalive flag |
| `maxPayloadBytes` | `number` | `65536` | Split batches above this size |

## Full working example

Here's the complete setup in 4 files:

```ts
// 1. app/api/clickmap/route.ts (server)
import { createClickmapRouteHandlers } from "@react-clickmap/next";
import { createPostgresAdapter } from "react-clickmap-postgres";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const { GET, POST, DELETE, OPTIONS } = createClickmapRouteHandlers(
  createPostgresAdapter({ sql: pool })
);
```

```tsx
// 2. app/providers.tsx (client)
"use client";
import { ClickmapProvider } from "react-clickmap";
import { createNextFetchAdapter } from "@react-clickmap/next";

const adapter = createNextFetchAdapter();

export function ClickmapClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClickmapProvider adapter={adapter} projectId="my-app" capture={["click", "scroll", "rage-click"]}>
      {children}
    </ClickmapProvider>
  );
}
export { adapter };
```

```tsx
// 3. app/layout.tsx
import { ClickmapClientProvider } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html><body><ClickmapClientProvider>{children}</ClickmapClientProvider></body></html>
  );
}
```

```tsx
// 4. app/dashboard/page.tsx (client)
"use client";
import { Heatmap, ScrollDepth } from "react-clickmap";
import { adapter } from "../providers";

export default function Dashboard() {
  return (
    <>
      <Heatmap adapter={adapter} page="/pricing" type="heatmap" />
      <ScrollDepth adapter={adapter} page="/pricing" />
    </>
  );
}
```
