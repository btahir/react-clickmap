# react-clickmap

Privacy-first heatmaps for React. Your data, your database, zero cloud.

## Install

```bash
npm install react-clickmap
```

## Features

- Click, scroll, pointer-move capture
- Dead-click and rage-click detection, capturable independently (e.g. `capture={['dead-click']}` alone works and won't also store plain clicks)
- Privacy controls (`Do Not Track`, `Global Privacy Control`, selector masking, sampling)
- Pluggable storage adapter interface, plus a built-in `fetchAdapter` for HTTP persistence
- Heatmap, clickmap, and scroll-depth visualizations
- Comparison heatmap overlays (before/after)
- Attention heatmap (scroll depth + interaction weighting)
- Element click-count overlay badges
- Export helpers (`toDataUrl`, `toBlob`, `download`) via `Heatmap` ref — WebGL contexts preserve the drawing buffer, so exports work on the WebGL renderer too, not just the Canvas fallback
- WebGL-preferred renderer (WebGL2 → WebGL1 → Canvas2D) with your custom `gradient` palette honored on every tier
- Ships with a `"use client"` directive in the built output, so it works out of the box in Next.js App Router / RSC trees

## Basic Usage

```tsx
import {
  ClickmapProvider,
  type HeatmapHandle,
  Heatmap,
  memoryAdapter
} from 'react-clickmap';
import { useRef } from 'react';

const adapter = memoryAdapter();

export function Demo() {
  const heatmapRef = useRef<HeatmapHandle>(null);

  return (
    <ClickmapProvider adapter={adapter} capture={['click', 'scroll']}>
      <main>...</main>
      <Heatmap
        ref={heatmapRef}
        adapter={adapter}
        page="/"
        type="heatmap"
        showElementClicks
      />
    </ClickmapProvider>
  );
}
```

## Capture types

`capture` accepts any combination of `'click' | 'scroll' | 'pointer-move' | 'rage-click' | 'dead-click'`. Each type is gated independently — enabling `'dead-click'` or `'rage-click'` on its own does not also emit `'click'` events, so `capture={['dead-click']}` gives you dead-click signal without storing every plain click. Include `'click'` explicitly if you also want raw clicks recorded.

## Persisting events over HTTP

```ts
import { fetchAdapter } from 'react-clickmap';

const adapter = fetchAdapter({
  endpoint: '/api/clickmap',
  headers: { Authorization: 'Bearer <token>' }, // optional
});
```

`fetchAdapter` prefers `navigator.sendBeacon` on page exit for reliability. `sendBeacon` can't carry custom headers, though, so as soon as `headers` is set, `save()` always uses `fetch(..., { keepalive: true })` instead — even for the page-exit flush — rather than silently dropping the configured headers. Batches larger than `maxPayloadBytes` (default 64 KB) are split automatically either way.

## API Surface

- Provider: `ClickmapProvider`
- Hooks: `useClickmap`, `useHeatmapData`
- Visualization: `Heatmap`, `ScrollDepth`, `HeatmapThumbnail`
- Advanced: `ComparisonHeatmap`, `AttentionHeatmap`
- Overlay: `ElementClickOverlay`
- Adapters: `fetchAdapter`, `memoryAdapter`, `localStorageAdapter`, `createAdapter`
- Rendering utilities: `detectRenderCapability`, `DEFAULT_GRADIENT`, `aggregateElementClicks`

## License

MIT
