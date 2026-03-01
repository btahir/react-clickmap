# react-clickmap

[![CI](https://github.com/btahir/react-clickmap/actions/workflows/ci.yml/badge.svg)](https://github.com/btahir/react-clickmap/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/react-clickmap.svg)](https://www.npmjs.com/package/react-clickmap)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![npm downloads](https://img.shields.io/npm/dm/react-clickmap.svg)](https://www.npmjs.com/package/react-clickmap)

Privacy-first heatmaps for React. Your data, your database, zero cloud.

`react-clickmap` captures click, scroll, and pointer-move behavior and renders heatmap overlays without sending data to third-party analytics vendors.

## Current Status

- Monorepo foundation and release tooling are in place.
- Capture engine is implemented with privacy controls, sampling, batching, and adapter abstraction.
- Built-in adapters: `memoryAdapter`, `fetchAdapter`, `localStorageAdapter`.
- First-party SQL persistence add-on: `react-clickmap-postgres`.
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
- Postgres add-on: `packages/react-clickmap-postgres`
- Docs scaffold: `apps/docs`

## Development

```bash
pnpm install
pnpm check
pnpm test:run
pnpm build
```

## Roadmap

See [issues](https://github.com/btahir/react-clickmap/issues) for active milestones and feature tracking.
