# @react-clickmap/next

Next.js integration helpers for `react-clickmap`.

## Install

```bash
pnpm add react-clickmap @react-clickmap/next
```

## What this package provides

- `createNextFetchAdapter`: Next-friendly fetch adapter defaults (`/api/clickmap`)
- `createClickmapRouteHandlers`: Route handler factory for `GET`, `POST`, `DELETE`, `OPTIONS`
- `useNextRouteKey`: App Router route key helper (`pathname + search`)

## Example route handler

```ts
import { createClickmapRouteHandlers } from "@react-clickmap/next";
import { memoryAdapter } from "react-clickmap";

const adapter = memoryAdapter();

export const { GET, POST, DELETE } = createClickmapRouteHandlers(adapter);
```

## Example client usage

```tsx
"use client";

import { useNextRouteKey } from "@react-clickmap/next";
import { Heatmap } from "react-clickmap";
import type { ClickmapAdapter } from "react-clickmap";

export function Overlay({ adapter }: { adapter: ClickmapAdapter }) {
  const routeKey = useNextRouteKey();
  return <Heatmap adapter={adapter} routeKey={routeKey} />;
}
```
