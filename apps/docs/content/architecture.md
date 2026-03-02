# Architecture Overview

react-clickmap has two pipelines: **capture** (browser → database) and **render** (database → heatmap overlay). They're connected by the adapter interface, which you control.

## System diagram

```
┌─ Browser ──────────────────────────────────────────────────────────┐
│                                                                     │
│  ClickmapProvider                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ Click Tracker │    │ Scroll       │    │ Pointer-Move         │  │
│  │ + Rage detect │    │ Tracker      │    │ Tracker              │  │
│  │ + Dead detect │    │              │    │                      │  │
│  └──────┬───────┘    └──────┬───────┘    └──────────┬───────────┘  │
│         │                   │                       │               │
│         └───────────────────┼───────────────────────┘               │
│                             ▼                                       │
│                    ┌────────────────┐                                │
│                    │  Event Batcher │  flush every 5s / 100 events   │
│                    │  + shutdown    │  + pagehide / visibilitychange │
│                    └────────┬───────┘                                │
│                             │                                       │
│                             ▼                                       │
│                    adapter.save(events[])                            │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Heatmap / ScrollDepth / AttentionHeatmap / Overlay           │ │
│  │                             ▲                                  │ │
│  │                    adapter.load(query)                          │ │
│  │                             │                                  │ │
│  │  ┌─────────────────┐    ┌──┴──────────────┐                   │ │
│  │  │ WebGL Renderer  │    │ Canvas Renderer  │                   │ │
│  │  │ (preferred)     │    │ (fallback)       │                   │ │
│  │  └─────────────────┘    └─────────────────┘                   │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                             │ ▲
                    save()   │ │   load()
                             ▼ │
┌─ Your Server / Database ──────────────────────────────────────────┐
│                                                                    │
│  ┌─────────────┐   ┌──────────────┐   ┌────────────────────────┐ │
│  │ Postgres    │   │ Supabase     │   │ Custom adapter         │ │
│  │ adapter     │   │ adapter      │   │ (MongoDB, DynamoDB...) │ │
│  └─────────────┘   └──────────────┘   └────────────────────────┘ │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

## Capture pipeline

### 1. Event listeners

When `ClickmapProvider` mounts, it starts listeners based on the `capture` prop:

- **Click tracker** — Listens to `pointerdown` events. Normalizes coordinates to viewport percentages. Detects dead clicks (click on non-interactive elements) and rage clicks (3+ rapid clicks within a small radius).
- **Scroll tracker** — Uses a throttled scroll listener with trailing-edge behavior. Records current depth and maximum depth.
- **Pointer-move tracker** — Throttled `pointermove` listener for attention heatmap data.

### 2. Event normalization

Raw browser events are transformed into `CaptureEvent` objects:

- Coordinates converted to viewport percentages (0–100)
- Device type detected from viewport width
- Unique `eventId` generated for deduplication
- SPA route tracked via `history.pushState`/`replaceState` patching

### 3. Batching

Events are queued in the `EventBatcher`, which flushes under these conditions:

| Trigger | When |
|---|---|
| Interval | Every `flushIntervalMs` (default 5000ms) |
| Batch size | When queue reaches `maxBatchSize` (default 100) |
| Visibility change | When the tab becomes hidden |
| Page exit | On `pagehide` event (best-effort via sendBeacon) |
| Manual stop | When the provider unmounts |

If a flush is already in-flight and another trigger fires, the batcher queues the pending reason and flushes again after the current one completes. On error, failed events are re-queued at the front.

### 4. Adapter persistence

The batcher calls `adapter.save(events)`. What happens next depends on your adapter:

- **fetchAdapter** → HTTP POST to your endpoint (with sendBeacon fallback)
- **Postgres adapter** → `INSERT INTO ... ON CONFLICT (event_id) DO NOTHING`
- **Supabase adapter** → REST API POST with `Prefer: resolution=ignore-duplicates`
- **memoryAdapter** → Push to in-memory array

## Render pipeline

### 1. Data loading

The `<Heatmap>` component (or `useHeatmapData` hook) calls `adapter.load(query)` with filter parameters (page, device, date range, etc.). The adapter returns an array of `CaptureEvent` objects.

For large datasets, adapters can implement `loadAggregated()` to return pre-binned coordinate data, avoiding the need to transfer millions of raw events.

### 2. Point normalization

Events are converted to render points:

- Click/pointer-move events → `{ x, y, weight }` (rage clicks get weight 2)
- Scroll events → depth bands for `ScrollDepth` rendering
- Attention mode → combined click + pointer-move + scroll-weighted zones

### 3. Rendering

The render system uses a 3-tier capability detection:

| Tier | Engine | When used |
|---|---|---|
| Tier 1 | WebGL 2 | Modern browsers (default) |
| Tier 2 | WebGL 1 | Older browsers without WebGL 2 |
| Tier 3 | Canvas 2D | Browsers without WebGL support |

**WebGL rendering:**
- Each point is drawn as a radial gradient circle on an offscreen framebuffer
- Points are blended additively to create heat accumulation
- A color gradient palette is applied as a post-process step
- The gradient palette is memoized to avoid rebuilding on every render

**Resilience:**
- Handles `webglcontextlost` / `webglcontextrestored` events gracefully
- `ResizeObserver` keeps the canvas sized correctly
- Throttled re-renders prevent excessive GPU work during scroll

## Privacy layer

Before any event is captured, the provider checks:

1. `respectDoNotTrack` — If enabled and `navigator.doNotTrack === "1"`, capture is disabled
2. `respectGlobalPrivacyControl` — If enabled and `navigator.globalPrivacyControl === true`, capture is disabled
3. `consentRequired` / `hasConsent` — If consent is required and not granted, no listeners start
4. `sampleRate` — Deterministic per-session sampling (uses a hash of the session ID)

## Session management

- Session IDs are generated using `crypto.randomUUID()` (or fallback) and stored in `sessionStorage`
- Sessions are scoped to the browser tab — a new tab gets a new session
- The session ID is deterministic for sampling: `hash(sessionId) / MAX_HASH < sampleRate`
