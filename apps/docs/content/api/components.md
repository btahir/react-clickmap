# Components API

## `ClickmapProvider`

Wraps your app tree. Starts capture listeners, manages the event batcher, and provides context to child components.

```tsx
import { ClickmapProvider, fetchAdapter } from "react-clickmap";

const adapter = fetchAdapter({ endpoint: "/api/clickmap" });

<ClickmapProvider
  adapter={adapter}
  projectId="my-app"
  capture={["click", "scroll", "rage-click", "dead-click"]}
  sampleRate={0.25}
  respectDoNotTrack
  respectGlobalPrivacyControl
>
  <App />
</ClickmapProvider>
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `adapter` | `ClickmapAdapter` | required | Persistence adapter |
| `projectId` | `string` | `"default"` | Project scope for events |
| `userId` | `string` | — | Optional user identifier |
| `capture` | `CaptureType[]` | `["click"]` | Event types to capture |
| `sampleRate` | `number` | `1` | Fraction of sessions to capture (0–1). Deterministic by session ID — the same session always gets the same decision. |
| `flushIntervalMs` | `number` | `5000` | Batcher flush interval in milliseconds |
| `maxBatchSize` | `number` | `100` | Flush when the queue reaches this size |
| `respectDoNotTrack` | `boolean` | `false` | Honor `navigator.doNotTrack` |
| `respectGlobalPrivacyControl` | `boolean` | `false` | Honor `navigator.globalPrivacyControl` |
| `consentRequired` | `boolean` | `false` | Require explicit consent before capturing |
| `hasConsent` | `boolean` | — | Current consent state |
| `maskSelectors` | `string[]` | `[]` | CSS selectors for elements to mask |
| `ignoreSelectors` | `string[]` | `[]` | CSS selectors for elements to ignore |

## `Heatmap`

Renders a heatmap, clickmap, or scrollmap overlay on the page. Loads events from the adapter and draws them using WebGL (with Canvas fallback).

```tsx
import { Heatmap } from "react-clickmap";

<Heatmap
  adapter={adapter}
  page="/pricing"
  type="heatmap"
  radius={25}
  opacity={0.6}
/>
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `adapter` | `ClickmapAdapter` | required | Where to load events from |
| `page` | `string` | — | Filter events by pathname |
| `routeKey` | `string` | — | Filter by SPA route key |
| `type` | `"heatmap" \| "clickmap" \| "scrollmap"` | `"heatmap"` | Visualization mode |
| `device` | `"all" \| "desktop" \| "tablet" \| "mobile"` | `"all"` | Device filter |
| `dateRange` | `{ from: number; to: number }` | — | Filter by timestamp range |
| `radius` | `number` | `20` | Heatmap point radius in pixels |
| `opacity` | `number` | `0.65` | Overlay opacity (0–1) |
| `gradient` | `GradientMap` | default gradient | Custom color gradient |
| `showElementClicks` | `boolean` | `false` | Show click-count badges on elements |
| `elementClickMinClicks` | `number` | `1` | Minimum clicks to show a badge |
| `elementClickMaxBadges` | `number` | `20` | Maximum badges to render |

### Imperative handle

Use a ref to access export methods:

```tsx
import { useRef } from "react";
import { Heatmap, type HeatmapHandle } from "react-clickmap";

const ref = useRef<HeatmapHandle>(null);

<Heatmap ref={ref} adapter={adapter} page="/pricing" />

// Export as PNG
await ref.current?.download("pricing-heatmap.png");

// Get data URL
const dataUrl = await ref.current?.toDataUrl();

// Get Blob
const blob = await ref.current?.toBlob();
```

## `ScrollDepth`

Renders a vertical depth rail showing how far users scroll on a page.

```tsx
import { ScrollDepth } from "react-clickmap";

<ScrollDepth
  adapter={adapter}
  page="/pricing"
  width={12}
/>
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `adapter` | `ClickmapAdapter` | required | Where to load scroll events from |
| `page` | `string` | — | Filter by pathname |
| `width` | `number` | `8` | Rail width in pixels |

## `AttentionHeatmap`

Combines click, pointer-move, and scroll data to render weighted attention zones. Areas with more interaction + deeper scroll depth get higher weights.

```tsx
import { AttentionHeatmap } from "react-clickmap";

<AttentionHeatmap
  adapter={adapter}
  page="/pricing"
  radius={30}
  opacity={0.5}
/>
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `adapter` | `ClickmapAdapter` | required | Where to load events from |
| `page` | `string` | — | Filter by pathname |
| `radius` | `number` | `25` | Point radius |
| `opacity` | `number` | `0.6` | Overlay opacity |
| `device` | `"all" \| DeviceType` | `"all"` | Device filter |

## `ComparisonHeatmap`

Renders two heatmaps side by side for before/after comparison. Useful for measuring the impact of design changes.

```tsx
import { ComparisonHeatmap } from "react-clickmap";

<ComparisonHeatmap
  adapter={adapter}
  page="/pricing"
  beforeDateRange={{ from: lastWeekStart, to: lastWeekEnd }}
  afterDateRange={{ from: thisWeekStart, to: thisWeekEnd }}
/>
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `adapter` | `ClickmapAdapter` | required | Where to load events from |
| `page` | `string` | — | Shared page filter |
| `routeKey` | `string` | — | Shared route key filter |
| `device` | `"all" \| DeviceType` | `"all"` | Shared device filter |
| `beforeDateRange` | `{ from: number; to: number }` | required | Left panel time range |
| `afterDateRange` | `{ from: number; to: number }` | required | Right panel time range |

## `HeatmapThumbnail`

Compact heatmap preview for dashboards, lists, and cards. Renders at a fixed size.

```tsx
import { HeatmapThumbnail } from "react-clickmap";

<HeatmapThumbnail
  adapter={adapter}
  page="/pricing"
  width={300}
  height={200}
/>
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `adapter` | `ClickmapAdapter` | required | Where to load events from |
| `page` | `string` | — | Filter by pathname |
| `width` | `number` | `320` | Thumbnail width in pixels |
| `height` | `number` | `240` | Thumbnail height in pixels |

## `ElementClickOverlay`

Renders click-count badges anchored to visible DOM elements. Shows which buttons, links, and interactive elements get the most clicks.

```tsx
import { ElementClickOverlay } from "react-clickmap";

<ElementClickOverlay
  adapter={adapter}
  page="/pricing"
  minClicks={3}
  maxBadges={12}
/>
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `adapter` | `ClickmapAdapter` | required | Where to load click events from |
| `page` | `string` | — | Filter by pathname |
| `minClicks` | `number` | `1` | Minimum clicks to show a badge |
| `maxBadges` | `number` | `20` | Maximum badges to render |

## `useClickmap` hook

Access the capture engine context from any child component:

```tsx
import { useClickmap } from "react-clickmap";

function StatusBar() {
  const { isCapturing, eventCount, queueSize } = useClickmap();

  return (
    <div>
      Capturing: {isCapturing ? "Yes" : "No"} |
      Events: {eventCount} |
      Queue: {queueSize}
    </div>
  );
}
```
