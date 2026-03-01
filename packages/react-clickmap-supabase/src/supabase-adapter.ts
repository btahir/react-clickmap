import type {
  AggregatedHeatmapPayload,
  CaptureEvent,
  ClickmapAdapter,
  HeatmapQuery,
  PointerType,
} from "react-clickmap";
import type { SupabaseAdapterOptions, SupabaseEventRow } from "./types";

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function buildBaseHeaders(options: SupabaseAdapterOptions): HeadersInit {
  return {
    apikey: options.anonKey,
    authorization: `Bearer ${options.anonKey}`,
    "content-type": "application/json",
    ...(options.schema
      ? { "accept-profile": options.schema, "content-profile": options.schema }
      : {}),
  };
}

function normalizePointerType(pointerType: string | null): PointerType {
  if (pointerType === "mouse" || pointerType === "touch" || pointerType === "pen") {
    return pointerType;
  }

  return "unknown";
}

function toRow(event: CaptureEvent): Record<string, unknown> {
  const hasCoordinates = "x" in event && "y" in event;
  const hasPointerType = "pointerType" in event;
  const hasSelector = "selector" in event;

  let payload: Record<string, unknown> = {};
  if (event.type === "rage-click") {
    payload = {
      clusterSize: event.clusterSize,
      windowMs: event.windowMs,
      radiusPx: event.radiusPx,
    };
  } else if (event.type === "dead-click") {
    payload = {
      reason: event.reason,
    };
  }

  return {
    event_id: event.eventId,
    project_id: event.projectId,
    session_id: event.sessionId,
    user_id: event.userId ?? null,
    occurred_at: new Date(event.timestamp).toISOString(),
    event_type: event.type,
    page_path: event.pathname,
    route_key: event.routeKey,
    device_type: event.deviceType,
    viewport_w: event.viewport.width,
    viewport_h: event.viewport.height,
    scroll_x: event.viewport.scrollX,
    scroll_y: event.viewport.scrollY,
    x_pct: hasCoordinates ? event.x : null,
    y_pct: hasCoordinates ? event.y : null,
    pointer_type: hasPointerType ? event.pointerType : null,
    selector_masked_path: hasSelector ? (event.selector ?? null) : null,
    depth_pct: event.type === "scroll" ? event.depth : null,
    max_depth_pct: event.type === "scroll" ? event.maxDepth : null,
    is_rage_click: event.type === "rage-click",
    is_dead_click: event.type === "dead-click",
    payload_jsonb: payload,
    schema_version: event.schemaVersion,
  };
}

function fromRow(row: SupabaseEventRow): CaptureEvent {
  const base = {
    schemaVersion: 1 as const,
    eventVersion: 1 as const,
    eventId: row.event_id,
    projectId: row.project_id,
    sessionId: row.session_id,
    ...(row.user_id ? { userId: row.user_id } : {}),
    timestamp: Date.parse(row.occurred_at),
    pathname: row.page_path,
    routeKey: row.route_key,
    deviceType: row.device_type as CaptureEvent["deviceType"],
    viewport: {
      width: row.viewport_w,
      height: row.viewport_h,
      scrollX: row.scroll_x,
      scrollY: row.scroll_y,
    },
  };

  const selector = row.selector_masked_path ? { selector: row.selector_masked_path } : {};
  const payload = row.payload_jsonb ?? {};

  if (row.event_type === "scroll") {
    return {
      ...base,
      type: "scroll",
      depth: row.depth_pct ?? 0,
      maxDepth: row.max_depth_pct ?? 0,
    };
  }

  if (row.event_type === "pointer-move") {
    return {
      ...base,
      type: "pointer-move",
      x: row.x_pct ?? 0,
      y: row.y_pct ?? 0,
      pointerType: normalizePointerType(row.pointer_type),
    };
  }

  if (row.event_type === "rage-click") {
    return {
      ...base,
      ...selector,
      type: "rage-click",
      x: row.x_pct ?? 0,
      y: row.y_pct ?? 0,
      pointerType: normalizePointerType(row.pointer_type),
      clusterSize:
        typeof payload.clusterSize === "number"
          ? payload.clusterSize
          : Number(payload.clusterSize ?? 3),
      windowMs:
        typeof payload.windowMs === "number" ? payload.windowMs : Number(payload.windowMs ?? 500),
      radiusPx:
        typeof payload.radiusPx === "number" ? payload.radiusPx : Number(payload.radiusPx ?? 30),
    };
  }

  if (row.event_type === "dead-click") {
    return {
      ...base,
      ...selector,
      type: "dead-click",
      x: row.x_pct ?? 0,
      y: row.y_pct ?? 0,
      pointerType: normalizePointerType(row.pointer_type),
      reason: "non-interactive-target",
    };
  }

  return {
    ...base,
    ...selector,
    type: "click",
    x: row.x_pct ?? 0,
    y: row.y_pct ?? 0,
    pointerType: normalizePointerType(row.pointer_type),
  };
}

function appendFilters(searchParams: URLSearchParams, query: HeatmapQuery): void {
  if (query.page) {
    searchParams.set("page_path", `eq.${query.page}`);
  }

  if (query.routeKey) {
    searchParams.set("route_key", `eq.${query.routeKey}`);
  }

  if (query.sessionId) {
    searchParams.set("session_id", `eq.${query.sessionId}`);
  }

  if (query.projectId) {
    searchParams.set("project_id", `eq.${query.projectId}`);
  }

  if (query.userId) {
    searchParams.set("user_id", `eq.${query.userId}`);
  }

  if (query.device && query.device !== "all") {
    searchParams.set("device_type", `eq.${query.device}`);
  }

  if (query.types && query.types.length > 0) {
    searchParams.set("event_type", `in.(${query.types.join(",")})`);
  }

  if (typeof query.from === "number") {
    searchParams.set("occurred_at", `gte.${new Date(query.from).toISOString()}`);
  }

  if (typeof query.to === "number") {
    searchParams.set("occurred_at", `lte.${new Date(query.to).toISOString()}`);
  }
}

export function createSupabaseAdapter(options: SupabaseAdapterOptions): ClickmapAdapter {
  const baseUrl = trimTrailingSlash(options.url);
  const table = options.table ?? "clickmap_events";
  const fetchImpl = options.fetchImpl ?? fetch;
  const headers = buildBaseHeaders(options);

  return {
    capabilities: {
      supportsAggregation: true,
      supportsRetention: true,
      supportsIdempotency: true,
    },

    async save(events: CaptureEvent[]): Promise<void> {
      if (events.length === 0) {
        return;
      }

      const response = await fetchImpl(`${baseUrl}/rest/v1/${table}`, {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "resolution=ignore-duplicates",
        },
        body: JSON.stringify(events.map((event) => toRow(event))),
      });

      if (!response.ok) {
        throw new Error(`Failed to save Supabase clickmap events. Status: ${response.status}`);
      }
    },

    async load(query: HeatmapQuery): Promise<CaptureEvent[]> {
      const searchParams = new URLSearchParams();
      searchParams.set("select", "*");
      searchParams.set("order", "occurred_at.asc");
      if (typeof query.limit === "number" && query.limit > 0) {
        searchParams.set("limit", String(query.limit));
      }
      appendFilters(searchParams, query);

      const response = await fetchImpl(`${baseUrl}/rest/v1/${table}?${searchParams.toString()}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to load Supabase clickmap events. Status: ${response.status}`);
      }

      const rows = (await response.json()) as SupabaseEventRow[];
      return rows.map((row) => fromRow(row));
    },

    async deleteEvents(query: HeatmapQuery): Promise<number> {
      const searchParams = new URLSearchParams();
      appendFilters(searchParams, query);

      if (Array.from(searchParams.keys()).length === 0) {
        throw new Error("Supabase deleteEvents requires at least one query filter");
      }

      const response = await fetchImpl(`${baseUrl}/rest/v1/${table}?${searchParams.toString()}`, {
        method: "DELETE",
        headers: {
          ...headers,
          Prefer: "return=representation",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete Supabase clickmap events. Status: ${response.status}`);
      }

      const deletedRows = (await response.json()) as unknown[];
      return deletedRows.length;
    },

    async loadAggregated(query: HeatmapQuery): Promise<AggregatedHeatmapPayload> {
      const events = await this.load(query);
      const bucketMap = new Map<string, { x: number; y: number; value: number }>();

      let width = 1000;
      let height = 800;

      for (const event of events) {
        width = Math.max(width, event.viewport.width);
        height = Math.max(height, event.viewport.height);

        if (!("x" in event) || !("y" in event)) {
          continue;
        }

        const x = Math.round(event.x * 100) / 100;
        const y = Math.round(event.y * 100) / 100;
        const key = `${x}:${y}`;
        const current = bucketMap.get(key) ?? { x, y, value: 0 };
        current.value += event.type === "rage-click" ? 2 : 1;
        bucketMap.set(key, current);
      }

      const bins = Array.from(bucketMap.values());
      return {
        width,
        height,
        bins,
        totalEvents: bins.reduce((sum, bin) => sum + bin.value, 0),
      };
    },
  };
}
