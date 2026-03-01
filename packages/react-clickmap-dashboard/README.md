# @react-clickmap/dashboard

Batteries-included dashboard UI for `react-clickmap`.

## Install

```bash
pnpm add react-clickmap @react-clickmap/dashboard
```

## Usage

```tsx
"use client";

import { ClickmapDashboard } from "@react-clickmap/dashboard";
import { memoryAdapter } from "react-clickmap";

const adapter = memoryAdapter();

export default function AnalyticsPage() {
  return (
    <main style={{ padding: 20 }}>
      <ClickmapDashboard
        adapter={adapter}
        title="Behavior Overview"
        subtitle="Self-hosted event intelligence"
        showOverlayControls
      />
    </main>
  );
}
```

## Built-in panels

- KPI metrics (events, sessions, rage/dead rates, scroll depth)
- Event mix distribution bars
- Device distribution
- Top pages
- Element hotspot summaries
- Hourly activity timeline

## Overlay controls

Enable and toggle overlays from the dashboard:

- Heatmap overlay
- Attention overlay
- Comparison overlay (when `compareRange` is provided)
- Scroll-depth rail
