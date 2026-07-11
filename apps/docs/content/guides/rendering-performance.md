# Rendering and Performance Guide

This guide covers how react-clickmap renders heatmap overlays, the rendering engine tiers, and how to optimize performance for large datasets.

## Rendering modes

The `<Heatmap>` component supports three visualization modes:

### Heatmap mode (`type="heatmap"`)

Classic gaussian-blur heat overlay. Each click/interaction point is drawn as a radial gradient circle. Points overlap and blend additively — areas with more interactions appear hotter (red/yellow), while sparse areas appear cool (blue/green) or transparent.

```tsx
<Heatmap adapter={adapter} page="/pricing" type="heatmap" radius={25} opacity={0.6} />
```

### Clickmap mode (`type="clickmap"`)

Individual click dots with no blurring. Each click is a discrete point. Useful for seeing exact click positions rather than aggregated heat.

```tsx
<Heatmap adapter={adapter} page="/pricing" type="clickmap" />
```

### Scrollmap mode (`type="scrollmap"`)

Horizontal depth bands showing how far users scroll. The top of the page is hot (red — everyone sees it), and deeper sections fade to cool (blue — fewer users reach them).

```tsx
<Heatmap adapter={adapter} page="/pricing" type="scrollmap" />
```

## Renderer fallback

react-clickmap automatically selects the best available renderer for the overlay `<canvas>`:

| Engine | Detection | Performance |
|---|---|---|
| WebGL 2 | `canvas.getContext("webgl2")` succeeds | Best — GPU-accelerated |
| WebGL 1 | `canvas.getContext("webgl")` succeeds | Good — GPU-accelerated |
| Canvas 2D | Always available | Adequate — CPU-rendered |

You don't need to configure this — it's automatic. `WebGLRenderer` tries WebGL2 first, falls back to WebGL1, and `createRenderer` falls back to `CanvasRenderer` entirely if no WebGL context can be created. The `detectRenderCapability()` function is exported if you want to check what's available in the current environment:

```ts
import { detectRenderCapability } from "react-clickmap";

const cap = detectRenderCapability();
console.log(cap.webgl2); // boolean
console.log(cap.webgl1); // boolean
```

## WebGL rendering details

The WebGL renderer works by:

1. Drawing each point as a radial gradient circle directly onto the overlay canvas
2. Blending points additively (overlapping areas accumulate intensity)
3. Sampling a gradient palette texture (matching your `gradient` prop) in the fragment shader to colorize each point
4. Preserving the drawing buffer so `toDataUrl()`/`toBlob()`/`download()` can read back a rendered frame

### Context loss handling

WebGL contexts can be lost when the GPU is under pressure, the tab is backgrounded, or the device wakes from sleep. react-clickmap handles this:

- Listens for `webglcontextlost` — pauses rendering, prevents default
- Listens for `webglcontextrestored` — re-initializes shaders and re-renders
- Falls back to Canvas 2D if context restoration fails

### Gradient palette memoization

The color gradient (which maps intensity values to colors) is pre-computed into a 256-entry lookup table. This palette is cached and reused across renders — it's only rebuilt if you change the `gradient` prop.

## Canvas sizing

The heatmap canvas is sized to match its container using `ResizeObserver`. When the container resizes (window resize, layout change, etc.), the canvas is resized and re-rendered automatically.

## Performance optimization

### Large datasets

For pages with millions of events, use the `loadAggregated()` capability:

- The Postgres adapter supports server-side aggregation — it bins coordinates and returns weighted summaries instead of raw events
- This reduces data transfer from millions of rows to a few thousand bins

If your adapter supports aggregation, the `<Heatmap>` component will use it automatically when `capabilities.supportsAggregation` is `true`.

### Limiting event count

Use the `limit` parameter in your queries to cap the number of events loaded:

```tsx
<Heatmap adapter={adapter} page="/pricing" type="heatmap" />
```

Or with the hook:

```tsx
const { data } = useHeatmapData(adapter, {
  page: "/pricing",
  limit: 10000,  // only load the most recent 10K events
});
```

### Sampling

Reduce capture volume at the source:

```tsx
<ClickmapProvider sampleRate={0.1}>  {/* Only capture 10% of sessions */}
```

### Date range filtering

Load only recent events instead of all-time data:

```tsx
<Heatmap
  adapter={adapter}
  page="/pricing"
  dateRange={{
    from: Date.now() - 7 * 24 * 60 * 60 * 1000,  // last 7 days
    to: Date.now(),
  }}
/>
```

## Runtime capture behavior

### Batching

Events are not sent one-by-one. The `EventBatcher` queues events and flushes in batches:

- Every 5 seconds (configurable via `flushIntervalMs`)
- When 100 events queue up (configurable via `maxBatchSize`)
- When the tab becomes hidden (`visibilitychange`)
- When the user navigates away (`pagehide`) — uses `sendBeacon` for reliability

### Throttling

Scroll and pointer-move listeners use trailing-edge throttling to prevent excessive event creation:

- Scroll events are throttled to prevent firing on every pixel of scroll
- Pointer-move events are sampled at a controlled rate
- The trailing-edge behavior ensures the final position is always captured

### Route transitions

When the user navigates within an SPA (detected via `history.pushState` / `replaceState` patching), the batcher flushes the current queue before the new route starts capturing. This ensures events are correctly attributed to the page they occurred on.
