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
    doc_x_pct: "docX" in event && typeof event.docX === "number" ? event.docX : null,
    doc_y_pct: "docY" in event && typeof event.docY === "number" ? event.docY : null,
    doc_w: "docWidth" in event && typeof event.docWidth === "number" ? event.docWidth : null,
    doc_h: "docHeight" in event && typeof event.docHeight === "number" ? event.docHeight : null,
    pointer_type: hasPointerType ? event.pointerType : null,
    selector_masked_path: hasSelector ? (event.selector ?? null) : null,
    depth_pct: event.type === "scroll" ? event.depth : null,
    max_depth_pct: event.type === "scroll" ? event.maxDepth : null,
    is_rage_click: event.type === "rage-click",
    is_dead_click: event.type === "dead-click",
    payload_jsonb: { ...payload, ...(event.layoutId ? { layoutId: event.layoutId } : {}) },
    schema_version: event.schemaVersion,
  };
}

function fromRow(row: SupabaseEventRow): CaptureEvent {
  const base = {
    ...(typeof row.payload_jsonb?.layoutId === "string"
      ? { layoutId: row.payload_jsonb.layoutId }
      : {}),
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

  // Additive document-relative coordinates; omitted for rows predating them.
  const doc: Record<string, number> = {};
  if (typeof row.doc_x_pct === "number") doc.docX = row.doc_x_pct;
  if (typeof row.doc_y_pct === "number") doc.docY = row.doc_y_pct;
  if (typeof row.doc_w === "number") doc.docWidth = row.doc_w;
  if (typeof row.doc_h === "number") doc.docHeight = row.doc_h;

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
      ...doc,
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
      ...doc,
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
      ...doc,
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
    ...doc,
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
    searchParams.append("occurred_at", `gte.${new Date(query.from).toISOString()}`);
  }

  if (typeof query.to === "number") {
    searchParams.append("occurred_at", `lt.${new Date(query.to).toISOString()}`);
  }
  if (query.layoutId) searchParams.set("payload_jsonb->>layoutId", `eq.${query.layoutId}`);
  if (query.viewportMin !== undefined)
    searchParams.append("viewport_w", `gte.${query.viewportMin}`);
  if (query.viewportMax !== undefined)
    searchParams.append("viewport_w", `lte.${query.viewportMax}`);
}

// PostgREST (and most hosting providers fronting it) reject overly large
// request bodies. Chunking keeps each POST well within typical limits and
// avoids one oversized flush failing outright.
const MAX_SAVE_BATCH_SIZE = 500;

function chunkEvents(events: CaptureEvent[], size: number): CaptureEvent[][] {
  const chunks: CaptureEvent[][] = [];

  for (let index = 0; index < events.length; index += size) {
    chunks.push(events.slice(index, index + size));
  }

  return chunks;
}

export function createSupabaseAdapter(options: SupabaseAdapterOptions): ClickmapAdapter {
  const baseUrl = trimTrailingSlash(options.url);
  const table = options.table ?? "clickmap_events";
  const fetchImpl = options.fetchImpl ?? fetch;
  const headers = buildBaseHeaders(options);

  return {
    capabilities: {
      // loadAggregated() fetches raw rows and reduces them in JS -- it is
      // not real server-side aggregation, so callers that branch on this
      // flag (to decide whether it's safe to request aggregation for large
      // datasets) should not be told the server does the heavy lifting.
      supportsAggregation: false,
      supportsRetention: true,
      supportsIdempotency: true,
    },

    async save(events: CaptureEvent[]): Promise<void> {
      if (events.length === 0) {
        return;
      }

      const chunks = chunkEvents(events, MAX_SAVE_BATCH_SIZE);

      for (const chunk of chunks) {
        const response = await fetchImpl(`${baseUrl}/rest/v1/${table}`, {
          method: "POST",
          headers: {
            ...headers,
            Prefer: "resolution=ignore-duplicates",
          },
          body: JSON.stringify(chunk.map((event) => toRow(event))),
        });

        if (!response.ok) {
          throw new Error(`Failed to save Supabase clickmap events. Status: ${response.status}`);
        }
      }
    },

    async load(query: HeatmapQuery): Promise<CaptureEvent[]> {
      const searchParams = new URLSearchParams();
      searchParams.set("select", "*");
      searchParams.set("order", "occurred_at.asc,event_id.asc");
      if (typeof query.limit === "number" && query.limit > 0) {
        searchParams.set("limit", String(query.limit));
      }
      appendFilters(searchParams, query);

      const cap = Math.min(query.limit ?? 100000, options.maxReadEvents ?? 100000);
      const all: SupabaseEventRow[] = [];
      for (let offset = 0; offset <= cap; ) {
        searchParams.set("offset", String(offset));
        searchParams.set("limit", String(Math.min(1000, cap - offset + 1)));
        const response = await fetchImpl(`${baseUrl}/rest/v1/${table}?${searchParams}`, {
          method: "GET",
          headers: { ...headers, Prefer: "count=exact" },
        });
        if (!response.ok)
          throw new Error(`Failed to load Supabase clickmap events. Status: ${response.status}`);
        const rows = (await response.json()) as SupabaseEventRow[];
        all.push(...rows);
        offset += rows.length;
        const range = response.headers.get("content-range");
        const total = range ? Number(range.split("/")[1]) : NaN;
        if (all.length > cap) throw new Error("Clickmap query exceeds limit; narrow the cohort");
        if (Number.isFinite(total) && offset >= total) return all.map(fromRow);
        if (!rows.length)
          throw new Error("Incomplete Clickmap query: empty page before verified total");
        if (!range) throw new Error("Cannot verify pagination: missing Content-Range");
      }
      throw new Error("Incomplete Clickmap query");
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
      const documentSpace = query.coordinateSpace === "document";

      let width = documentSpace ? 0 : 1000;
      let height = documentSpace ? 0 : 800;

      for (const event of events) {
        if (documentSpace) {
          // Document-space width/height come from the per-event doc size, not
          // the viewport; events written before doc coordinates existed carry
          // neither and are skipped below, so they can't drag these to 0.
          if ("docWidth" in event && typeof event.docWidth === "number") {
            width = Math.max(width, event.docWidth);
          }
          if ("docHeight" in event && typeof event.docHeight === "number") {
            height = Math.max(height, event.docHeight);
          }
        } else {
          width = Math.max(width, event.viewport.width);
          height = Math.max(height, event.viewport.height);
        }

        if (!("x" in event) || !("y" in event)) {
          continue;
        }

        let binX: number;
        let binY: number;
        if (documentSpace) {
          if (
            !("docX" in event) ||
            !("docY" in event) ||
            typeof event.docX !== "number" ||
            typeof event.docY !== "number"
          ) {
            continue;
          }
          binX = event.docX;
          binY = event.docY;
        } else {
          binX = event.x;
          binY = event.y;
        }

        const x = Math.round(binX * 100) / 100;
        const y = Math.round(binY * 100) / 100;
        const key = `${x}:${y}`;
        const current = bucketMap.get(key) ?? { x, y, value: 0 };
        current.value += event.type === "rage-click" ? 2 : 1;
        bucketMap.set(key, current);
      }

      const bins = Array.from(bucketMap.values());
      return {
        width: width || (documentSpace ? 5000 : 1000),
        height: height || (documentSpace ? 5000 : 800),
        bins,
        totalEvents: bins.reduce((sum, bin) => sum + bin.value, 0),
      };
    },
  };
}
