# Event Model API

Every interaction captured by react-clickmap produces a `CaptureEvent`. This page documents the event structure, types, and fields.

## Event types

```ts
type CaptureType = "click" | "dead-click" | "rage-click" | "scroll" | "pointer-move";
```

| Type | Description | Key fields |
|---|---|---|
| `click` | Standard click/tap | `x`, `y`, `pointerType` |
| `dead-click` | Click on a non-interactive element | `x`, `y`, `pointerType`, `reason` |
| `rage-click` | 3+ rapid clicks in a small area | `x`, `y`, `pointerType`, `selector`, `clusterSize`, `windowMs`, `radiusPx` |
| `scroll` | Scroll depth measurement | `depth`, `maxDepth` |
| `pointer-move` | Mouse/touch movement | `x`, `y`, `pointerType` |

## Common fields (all events)

Every event shares these base fields:

```ts
interface EventBase {
  schemaVersion: 1;          // always 1 (for future migrations)
  eventVersion: 1;           // event schema version
  eventId: string;           // unique ID (generated client-side, used for deduplication)
  projectId: string;         // from ClickmapProvider's projectId prop
  sessionId: string;         // anonymous session ID (stored in sessionStorage)
  userId?: string;           // from ClickmapProvider's userId prop (optional)
  timestamp: number;         // milliseconds since epoch
  pathname: string;          // window.location.pathname at capture time
  routeKey: string;          // SPA route key (pathname + optional query string)
  deviceType: DeviceType;    // "desktop" | "tablet" | "mobile"
  viewport: ViewportState;   // viewport dimensions and scroll position
}

interface ViewportState {
  width: number;             // viewport width in pixels
  height: number;            // viewport height in pixels
  scrollX: number;           // horizontal scroll offset
  scrollY: number;           // vertical scroll offset
}
```

## Document coordinates (all coordinate-bearing events)

Click, dead-click, rage-click, and pointer-move events additionally carry
document-relative coordinates for full-page heatmaps. All fields are optional
and additive — events captured before v0.3 (or clients that only report
viewport coordinates) omit them:

```ts
interface DocumentPosition {
  docX?: number;      // 0–100 percentage of document scrollWidth
  docY?: number;      // 0–100 percentage of document scrollHeight
  docWidth?: number;  // absolute document width (px) at capture time
  docHeight?: number; // absolute document height (px) at capture time
}
```

`docX` / `docY` power `<Heatmap coordinateSpace="document" />`; `docWidth` /
`docHeight` are handy for reconstructing pixel positions or bucketing by layout.

## Click event

```ts
interface ClickEvent extends EventBase, DocumentPosition {
  type: "click";
  x: number;                 // viewport-relative X (0–100 percentage)
  y: number;                 // viewport-relative Y (0–100 percentage)
  pointerType: PointerType;  // "mouse" | "touch" | "pen" | "unknown"
  selector?: string;         // CSS selector of the clicked element (if available)
  // + optional docX / docY / docWidth / docHeight (see above)
}
```

## Dead-click event

Triggered when a user clicks on an element that has no interactive role (no `onclick`, not a button, link, or input).

```ts
interface DeadClickEvent extends EventBase {
  type: "dead-click";
  x: number;
  y: number;
  pointerType: PointerType;
  selector?: string;
  reason: "non-interactive-target";
}
```

## Rage-click event

Triggered when a user clicks 3+ times within a small radius in a short time window. This is a strong signal of frustration.

```ts
interface RageClickEvent extends EventBase {
  type: "rage-click";
  x: number;
  y: number;
  pointerType: PointerType;
  selector: string;          // CSS selector of the rage-clicked element
  clusterSize: number;       // number of clicks in the cluster (>= 3)
  windowMs: number;          // time window of the cluster in milliseconds
  radiusPx: number;          // spatial radius of the cluster in pixels
}
```

## Scroll event

Captures how far the user has scrolled on the page.

```ts
interface ScrollEvent extends EventBase {
  type: "scroll";
  depth: number;             // current scroll depth as percentage (0–100)
  maxDepth: number;          // maximum depth reached during this session
}
```

## Pointer-move event

Tracks mouse or touch movement. Used for attention heatmaps.

```ts
interface PointerMoveEvent extends EventBase {
  type: "pointer-move";
  x: number;                 // viewport-relative X (0–100 percentage)
  y: number;                 // viewport-relative Y (0–100 percentage)
  pointerType: PointerType;
}
```

## The union type

All event types are combined into a discriminated union:

```ts
type CaptureEvent = ClickEvent | DeadClickEvent | RageClickEvent | ScrollEvent | PointerMoveEvent;
```

Use `event.type` to narrow:

```ts
function handleEvent(event: CaptureEvent) {
  switch (event.type) {
    case "click":
      console.log(`Click at (${event.x}, ${event.y})`);
      break;
    case "rage-click":
      console.log(`Rage click: ${event.clusterSize} clicks on ${event.selector}`);
      break;
    case "scroll":
      console.log(`Scroll depth: ${event.depth}%, max: ${event.maxDepth}%`);
      break;
  }
}
```

## Coordinate system

Click and pointer-move coordinates are stored in **two frames**, both as percentages (0–100):

- **Viewport** (`x` / `y`) — relative to the visible window. `x = 0` is the left edge, `x = 100` the right; `y = 0` the top, `y = 100` the bottom. Correct for above-the-fold overlays.
- **Document** (`docX` / `docY`) — relative to the full scrollable document (`scrollWidth` / `scrollHeight`). Correct for full-page overlays on long pages.

Both are resolution-independent — the same relative position produces the same percentages regardless of viewport size. Render the frame you want with `<Heatmap coordinateSpace="viewport" | "document" />` (default `"viewport"`). Old events without document coordinates are skipped in document mode.

## Event ID and deduplication

Every event gets a unique `eventId` generated client-side using a combination of `crypto.randomUUID()` (when available) or a timestamp-based fallback. This ID is used by the Postgres and Supabase adapters for idempotent inserts (`ON CONFLICT DO NOTHING`), preventing double-counting from retry logic.

## Device detection

The `deviceType` field is determined at capture time based on viewport width:

| Device | Viewport width |
|---|---|
| `mobile` | < 768px |
| `tablet` | 768px – 1024px |
| `desktop` | > 1024px |
