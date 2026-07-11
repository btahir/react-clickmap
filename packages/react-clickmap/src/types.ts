export type CaptureType = "click" | "dead-click" | "scroll" | "pointer-move" | "rage-click";

export type DeviceType = "desktop" | "tablet" | "mobile";

/**
 * Which coordinate frame a heatmap should be rendered/queried against.
 * - `viewport`: viewport-relative percentages (`x`/`y`) — the historical
 *   default, correct for above-the-fold overlays.
 * - `document`: document-relative percentages (`docX`/`docY`) — correct for
 *   full-page overlays on scrollable pages.
 */
export type CoordinateSpace = "viewport" | "document";

export type PointerType = "mouse" | "touch" | "pen" | "unknown";

export interface ViewportState {
  width: number;
  height: number;
  scrollX: number;
  scrollY: number;
}

export interface EventBase {
  schemaVersion: 1;
  eventVersion: 1;
  eventId: string;
  projectId: string;
  sessionId: string;
  userId?: string;
  timestamp: number;
  pathname: string;
  routeKey: string;
  deviceType: DeviceType;
  viewport: ViewportState;
}

/**
 * Document-relative position for full-page heatmaps. All fields are optional
 * and additive: events captured before v0.3 (or by clients that only report
 * viewport coordinates) simply omit them, and consumers fall back to the
 * viewport-relative `x`/`y`.
 *
 * - `docX`/`docY` are percentages (0-100) of the full document
 *   `scrollWidth`/`scrollHeight` at capture time. Percentages (rather than
 *   raw pixels) keep points roughly stable across responsive reflow.
 * - `docWidth`/`docHeight` record the absolute document size (px) at capture
 *   time, so a viewer can reconstruct pixel positions and filter by layout.
 */
export interface DocumentPosition {
  docX?: number;
  docY?: number;
  docWidth?: number;
  docHeight?: number;
}

export interface ClickEvent extends EventBase, DocumentPosition {
  type: "click";
  x: number;
  y: number;
  selector?: string;
  pointerType: PointerType;
}

export interface RageClickEvent extends EventBase, DocumentPosition {
  type: "rage-click";
  x: number;
  y: number;
  selector?: string;
  pointerType: PointerType;
  clusterSize: number;
  windowMs: number;
  radiusPx: number;
}

export interface DeadClickEvent extends EventBase, DocumentPosition {
  type: "dead-click";
  x: number;
  y: number;
  selector?: string;
  pointerType: PointerType;
  reason: "non-interactive-target";
}

export interface ScrollEvent extends EventBase {
  type: "scroll";
  depth: number;
  maxDepth: number;
}

export interface PointerMoveEvent extends EventBase, DocumentPosition {
  type: "pointer-move";
  x: number;
  y: number;
  pointerType: PointerType;
}

export type CaptureEvent =
  | ClickEvent
  | RageClickEvent
  | DeadClickEvent
  | ScrollEvent
  | PointerMoveEvent;

export interface HeatmapQuery {
  page?: string;
  routeKey?: string;
  from?: number;
  to?: number;
  device?: "all" | DeviceType;
  types?: CaptureType[];
  sessionId?: string;
  projectId?: string;
  userId?: string;
  limit?: number;
  /**
   * Coordinate frame to aggregate against when the adapter supports
   * server-side aggregation (`loadAggregated`). Defaults to `"viewport"`.
   * Ignored by `load()` (raw events always carry both frames).
   */
  coordinateSpace?: CoordinateSpace;
}

export interface AggregatedBin {
  x: number;
  y: number;
  value: number;
}

export interface AggregatedHeatmapPayload {
  width: number;
  height: number;
  bins: AggregatedBin[];
  totalEvents: number;
}

export interface AdapterCapabilities {
  supportsAggregation: boolean;
  supportsRetention: boolean;
  supportsIdempotency: boolean;
}

export interface ClickmapAdapter {
  capabilities?: AdapterCapabilities;
  save(events: CaptureEvent[]): Promise<void>;
  load(query: HeatmapQuery): Promise<CaptureEvent[]>;
  deleteEvents?(query: HeatmapQuery): Promise<number>;
  loadAggregated?(query: HeatmapQuery): Promise<AggregatedHeatmapPayload>;
}
