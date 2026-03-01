# react-clickmap

Privacy-first heatmaps for React. Your data, your database, zero cloud.

## Features

- Click, scroll, pointer-move capture
- Dead-click and rage-click detection
- Privacy controls (`Do Not Track`, `Global Privacy Control`, selector masking)
- Pluggable storage adapter interface
- Heatmap, clickmap, and scroll-depth visualizations
- Comparison heatmap overlays (before/after)
- Attention heatmap (scroll depth + interaction weighting)
- Element click-count overlay badges
- Export helpers (`toDataUrl`, `toBlob`, `download`) via `Heatmap` ref
- WebGL preferred renderer with Canvas fallback

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

## API Surface

- Provider: `ClickmapProvider`
- Hooks: `useClickmap`, `useHeatmapData`
- Visualization: `Heatmap`, `ScrollDepth`, `HeatmapThumbnail`
- Advanced: `ComparisonHeatmap`, `AttentionHeatmap`
- Overlay: `ElementClickOverlay`
- Adapters: `fetchAdapter`, `memoryAdapter`, `localStorageAdapter`, `createAdapter`

## License

MIT
