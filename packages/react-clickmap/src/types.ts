export type CaptureType = 'click' | 'scroll' | 'pointer-move' | 'rage-click';

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

export type PointerType = 'mouse' | 'touch' | 'pen' | 'unknown';

export interface ViewportState {
  width: number;
  height: number;
  scrollX: number;
  scrollY: number;
}

export interface EventBase {
  schemaVersion: 1;
  eventVersion: 1;
  sessionId: string;
  timestamp: number;
  pathname: string;
  routeKey: string;
  deviceType: DeviceType;
  viewport: ViewportState;
}

export interface ClickEvent extends EventBase {
  type: 'click';
  x: number;
  y: number;
  selector?: string;
  pointerType: PointerType;
}

export interface RageClickEvent extends EventBase {
  type: 'rage-click';
  x: number;
  y: number;
  selector?: string;
  pointerType: PointerType;
  clusterSize: number;
  windowMs: number;
  radiusPx: number;
}

export interface ScrollEvent extends EventBase {
  type: 'scroll';
  depth: number;
  maxDepth: number;
}

export interface PointerMoveEvent extends EventBase {
  type: 'pointer-move';
  x: number;
  y: number;
  pointerType: PointerType;
}

export type CaptureEvent = ClickEvent | RageClickEvent | ScrollEvent | PointerMoveEvent;

export interface HeatmapQuery {
  page?: string;
  routeKey?: string;
  from?: number;
  to?: number;
  device?: 'all' | DeviceType;
  types?: CaptureType[];
  sessionId?: string;
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

export interface ClickmapAdapter {
  save(events: CaptureEvent[]): Promise<void>;
  load(query: HeatmapQuery): Promise<CaptureEvent[]>;
  loadAggregated?(query: HeatmapQuery): Promise<AggregatedHeatmapPayload>;
}
