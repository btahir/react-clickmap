# Next.js App Router Integration

## Client boundaries

`react-clickmap` capture/render components are client-only. Use them in client components.

```tsx
"use client";

import { ClickmapProvider, Heatmap } from "react-clickmap";
```

## Route transitions

The runtime tracks SPA route transitions by listening to history and popstate changes.

## Recommended placement

- Place `ClickmapProvider` high in your client tree.
- Render `<Heatmap />` in route-level layouts or pages where overlays are needed.
