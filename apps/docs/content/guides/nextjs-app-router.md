# Next.js App Router Integration

## Client boundaries

`react-clickmap` capture/render components are client-only. Use them in client components.

```tsx
"use client";

import { ClickmapProvider, Heatmap } from "react-clickmap";
```

## `@react-clickmap/next` helpers

Use the add-on package for route handlers and route-key tracking:

```ts
import { createClickmapRouteHandlers, createNextFetchAdapter } from "@react-clickmap/next";
import { memoryAdapter } from "react-clickmap";

const adapter = memoryAdapter();
export const { GET, POST, DELETE, OPTIONS } = createClickmapRouteHandlers(adapter);

export const clientAdapter = createNextFetchAdapter({ endpoint: "/api/clickmap" });
```

```tsx
"use client";

import { useNextRouteKey } from "@react-clickmap/next";

const routeKey = useNextRouteKey();
```

## Route transitions

The runtime tracks SPA route transitions by listening to history and popstate changes.

## Recommended placement

- Place `ClickmapProvider` high in your client tree.
- Render `<Heatmap />` in route-level layouts or pages where overlays are needed.
