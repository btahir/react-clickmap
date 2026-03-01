export type CaptureType = "click" | "dead-click" | "scroll" | "pointer-move" | "rage-click";

export type DeviceType = "desktop" | "tablet" | "mobile";

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

export interface ClickEvent extends EventBase {
  type: "click";
  x: number;
  y: number;
  selector?: string;
  pointerType: PointerType;
}

export interface RageClickEvent extends EventBase {
  type: "rage-click";
  x: number;
  y: number;
  selector?: string;
  pointerType: PointerType;
  clusterSize: number;
  windowMs: number;
  radiusPx: number;
}

export interface DeadClickEvent extends EventBase {
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

export interface PointerMoveEvent extends EventBase {
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
