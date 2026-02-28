# react-clickmap

Privacy-first heatmaps for React. Your data, your database, zero cloud.

## Features

- Click, scroll, pointer-move capture
- Rage-click detection
- Privacy controls (`Do Not Track`, `Global Privacy Control`, selector masking)
- Pluggable storage adapter interface
- Heatmap, clickmap, and scroll-depth visualizations
- WebGL preferred renderer with Canvas fallback

## Basic Usage

```tsx
import {
  ClickmapProvider,
  Heatmap,
  memoryAdapter
} from 'react-clickmap';

const adapter = memoryAdapter();

export function Demo() {
  return (
    <ClickmapProvider adapter={adapter} capture={['click', 'scroll']}>
      <main>...</main>
      <Heatmap adapter={adapter} page="/" type="heatmap" />
    </ClickmapProvider>
  );
}
```

## API Surface

- Provider: `ClickmapProvider`
- Hooks: `useClickmap`, `useHeatmapData`
- Visualization: `Heatmap`, `ScrollDepth`, `HeatmapThumbnail`
- Adapters: `fetchAdapter`, `memoryAdapter`, `localStorageAdapter`, `createAdapter`

## License

MIT
