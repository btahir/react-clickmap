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
- Full-page, document-relative heatmaps (`coordinateSpace="document"`) for long scrollable pages
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

## Full-page (document-relative) heatmaps

By default overlays are viewport-relative: a `position: fixed` layer sized to the window, correct for above-the-fold analysis. For long, scrollable pages, render a full-page heatmap that spans the whole document:

```tsx
<Heatmap adapter={adapter} page="/" coordinateSpace="document" />
```

In `document` mode the overlay is a `position: absolute` layer sized to `document.documentElement.scrollHeight`, and points are placed from document-relative coordinates that the capture engine records alongside the viewport ones. It re-renders on resize as the document reflows. Mount `<Heatmap>` in a non-`position: relative` container (e.g. directly under `body`) so the overlay aligns with the document origin.

`coordinateSpace` also works on `AttentionHeatmap` and `ElementClickOverlay`. `ScrollDepth` is unchanged.

Every coordinate event stores both frames additively:

- Viewport: `x` / `y` (percentages of the viewport).
- Document: `docX` / `docY` (percentages of `scrollWidth` / `scrollHeight`) plus `docWidth` / `docHeight` (absolute px at capture time, useful for breakpoint analysis).

**Old data:** events captured before v0.3 have no document coordinates and are skipped in `document` mode (they still render normally in the default `viewport` mode). No migration of existing rows is required — the new fields are additive and default to unset.

**Breakpoint filtering:** filter any heatmap to a device class with `device="mobile" | "tablet" | "desktop"`. The stored `viewport.width` (and `docWidth`) let you bucket by breakpoint in your own queries when you need finer granularity.

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
