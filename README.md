# react-clickmap

Privacy-first heatmaps for React. Your data, your database, zero cloud.

`react-clickmap` captures click, scroll, and pointer-move behavior and renders heatmap overlays without sending data to third-party analytics vendors.

## Current Status

- Monorepo foundation and release tooling are in place.
- Capture engine is implemented with privacy controls, sampling, batching, and adapter abstraction.
- Built-in adapters: `memoryAdapter`, `fetchAdapter`, `localStorageAdapter`.
- Baseline visualization components are implemented:
  - `Heatmap`
  - `ScrollDepth`
  - `HeatmapThumbnail`
- Rendering supports capability-tier fallback (WebGL preferred, Canvas fallback).

## Install

```bash
pnpm add react-clickmap
```

## Quickstart

```tsx
import { ClickmapProvider, Heatmap, fetchAdapter } from 'react-clickmap';

const adapter = fetchAdapter({ endpoint: '/api/clickmap' });

export function App() {
  return (
    <ClickmapProvider
      adapter={adapter}
      capture={['click', 'scroll', 'rage-click']}
      sampleRate={0.25}
      respectDoNotTrack
      respectGlobalPrivacyControl
    >
      <YourApp />
      <Heatmap adapter={adapter} page="/pricing" type="heatmap" />
    </ClickmapProvider>
  );
}
```

## Package Layout

- Library: `packages/react-clickmap`
- Docs scaffold: `apps/docs`
- Strategy and milestones: `PLAN-REFINED.md`

## Development

```bash
pnpm install
pnpm check
pnpm test:run
pnpm build
```

## Notes

This environment is currently offline, so dependency installation and runtime validation require a network-enabled environment.
