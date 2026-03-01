import { useSyncExternalStore } from "react";
import {
  type CaptureEvent,
  type CaptureType,
  type ClickmapAdapter,
  type DeviceType,
  fetchAdapter,
  type HeatmapQuery,
} from "react-clickmap";

const VALID_CAPTURE_TYPES = new Set<CaptureType>([
  "click",
  "dead-click",
  "scroll",
  "pointer-move",
  "rage-click",
]);

const VALID_DEVICES = new Set<HeatmapQuery["device"]>(["all", "desktop", "tablet", "mobile"]);

export interface NextFetchAdapterOptions {
  endpoint?: string;
  loadEndpoint?: string;
  deleteEndpoint?: string;
  headers?: HeadersInit;
  fetchImpl?: typeof fetch;
  preferBeacon?: boolean;
  keepalive?: boolean;
  maxPayloadBytes?: number;
}

export interface ClickmapRouteCorsOptions {
  origin?: string;
  headers?: string[];
  methods?: string[];
  maxAgeSeconds?: number;
}

export interface ClickmapRouteHandlersOptions {
  cors?: ClickmapRouteCorsOptions;
  onError?: (error: unknown, request: Request) => Response | Promise<Response>;
}

export type ClickmapRouteHandler = (request: Request) => Promise<Response>;

export interface ClickmapRouteHandlers {
  OPTIONS: ClickmapRouteHandler;
  GET: ClickmapRouteHandler;
  POST: ClickmapRouteHandler;
  DELETE: ClickmapRouteHandler;
}

export interface UseNextRouteKeyOptions {
  includeSearch?: boolean;
  fallbackPathname?: string;
}

function toFiniteNumber(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toPositiveInteger(value: string | null): number | undefined {
  const parsed = toFiniteNumber(value);
  if (typeof parsed !== "number") {
    return undefined;
  }

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

function parseTypes(value: string | null): CaptureType[] | undefined {
  if (!value) {
    return undefined;
  }

  const types = value
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment): segment is CaptureType => VALID_CAPTURE_TYPES.has(segment as CaptureType));

  return types.length > 0 ? types : undefined;
}

function parseDevice(value: string | null): HeatmapQuery["device"] | undefined {
  if (!value) {
    return undefined;
  }

  if (!VALID_DEVICES.has(value as HeatmapQuery["device"])) {
    return undefined;
  }

  return value as DeviceType | "all";
}

function parseQuery(searchParams: URLSearchParams): HeatmapQuery {
  const query: HeatmapQuery = {};

  const page = searchParams.get("page");
  if (page) {
    query.page = page;
  }

  const routeKey = searchParams.get("routeKey");
  if (routeKey) {
    query.routeKey = routeKey;
  }

  const sessionId = searchParams.get("sessionId");
  if (sessionId) {
    query.sessionId = sessionId;
  }

  const projectId = searchParams.get("projectId");
  if (projectId) {
    query.projectId = projectId;
  }

  const userId = searchParams.get("userId");
  if (userId) {
    query.userId = userId;
  }

  const from = toFiniteNumber(searchParams.get("from"));
  if (typeof from === "number") {
    query.from = from;
  }

  const to = toFiniteNumber(searchParams.get("to"));
  if (typeof to === "number") {
    query.to = to;
  }

  const types = parseTypes(searchParams.get("types"));
  if (types) {
    query.types = types;
  }

  const device = parseDevice(searchParams.get("device"));
  if (device) {
    query.device = device;
  }

  const limit = toPositiveInteger(searchParams.get("limit"));
  if (typeof limit === "number") {
    query.limit = limit;
  }

  return query;
}

function withCorsHeaders(response: Response, cors?: ClickmapRouteCorsOptions): Response {
  if (!cors) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", cors.origin ?? "*");
  headers.set(
    "access-control-allow-methods",
    (cors.methods ?? ["GET", "POST", "DELETE", "OPTIONS"]).join(", "),
  );
  headers.set(
    "access-control-allow-headers",
    (cors.headers ?? ["content-type", "authorization"]).join(", "),
  );

  if (typeof cors.maxAgeSeconds === "number" && cors.maxAgeSeconds > 0) {
    headers.set("access-control-max-age", String(Math.floor(cors.maxAgeSeconds)));
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

type RouteListener = () => void;

let isHistoryPatched = false;
let pushStateOriginal: History["pushState"] | undefined;
let replaceStateOriginal: History["replaceState"] | undefined;
const routeListeners = new Set<RouteListener>();

function notifyRouteListeners(): void {
  for (const listener of routeListeners) {
    listener();
  }
}

function patchHistoryOnce(): void {
  if (isHistoryPatched || typeof window === "undefined") {
    return;
  }

  pushStateOriginal = window.history.pushState;
  replaceStateOriginal = window.history.replaceState;

  window.history.pushState = function pushState(...args: Parameters<History["pushState"]>): void {
    pushStateOriginal?.apply(window.history, args);
    notifyRouteListeners();
  };

  window.history.replaceState = function replaceState(
    ...args: Parameters<History["replaceState"]>
  ): void {
    replaceStateOriginal?.apply(window.history, args);
    notifyRouteListeners();
  };

  window.addEventListener("popstate", notifyRouteListeners);
  window.addEventListener("hashchange", notifyRouteListeners);
  isHistoryPatched = true;
}

function unpatchHistory(): void {
  if (!isHistoryPatched || typeof window === "undefined") {
    return;
  }

  if (pushStateOriginal) {
    window.history.pushState = pushStateOriginal;
  }

  if (replaceStateOriginal) {
    window.history.replaceState = replaceStateOriginal;
  }

  window.removeEventListener("popstate", notifyRouteListeners);
  window.removeEventListener("hashchange", notifyRouteListeners);

  isHistoryPatched = false;
  pushStateOriginal = undefined;
  replaceStateOriginal = undefined;
}

function subscribeRouteKey(listener: RouteListener): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  patchHistoryOnce();
  routeListeners.add(listener);

  return () => {
    routeListeners.delete(listener);
    if (routeListeners.size === 0) {
      unpatchHistory();
    }
  };
}

function resolveRouteKey(includeSearch: boolean, fallbackPathname: string): string {
  if (typeof window === "undefined") {
    return fallbackPathname;
  }

  const pathname = window.location.pathname || fallbackPathname;
  if (!includeSearch) {
    return pathname;
  }

  const query = window.location.search;
  return query ? `${pathname}${query}` : pathname;
}

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

async function parseEventsFromRequest(request: Request): Promise<CaptureEvent[]> {
  const body = (await request.json()) as CaptureEvent[] | { events?: CaptureEvent[] } | null;

  if (Array.isArray(body)) {
    return body;
  }

  if (body && Array.isArray(body.events)) {
    return body.events;
  }

  return [];
}

async function handleWithErrorBoundary(
  request: Request,
  options: ClickmapRouteHandlersOptions,
  callback: () => Promise<Response>,
): Promise<Response> {
  try {
    return withCorsHeaders(await callback(), options.cors);
  } catch (error) {
    if (options.onError) {
      return withCorsHeaders(await options.onError(error, request), options.cors);
    }

    return withCorsHeaders(jsonResponse({ error: asErrorMessage(error) }, 500), options.cors);
  }
}

export function createNextFetchAdapter(options: NextFetchAdapterOptions = {}): ClickmapAdapter {
  const endpoint = options.endpoint ?? "/api/clickmap";
  const loadEndpoint = options.loadEndpoint ?? endpoint;
  const deleteEndpoint = options.deleteEndpoint ?? loadEndpoint;

  const fetchOptions = {
    endpoint,
    loadEndpoint,
    deleteEndpoint,
    ...(options.headers ? { headers: options.headers } : {}),
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    ...(typeof options.preferBeacon === "boolean" ? { preferBeacon: options.preferBeacon } : {}),
    ...(typeof options.keepalive === "boolean" ? { keepalive: options.keepalive } : {}),
    ...(typeof options.maxPayloadBytes === "number"
      ? { maxPayloadBytes: options.maxPayloadBytes }
      : {}),
  };

  return fetchAdapter(fetchOptions);
}

export function useNextRouteKey(options: UseNextRouteKeyOptions = {}): string {
  const includeSearch = options.includeSearch ?? true;
  const fallbackPathname = options.fallbackPathname ?? "/";

  return useSyncExternalStore(
    subscribeRouteKey,
    () => resolveRouteKey(includeSearch, fallbackPathname),
    () => fallbackPathname,
  );
}

export function createClickmapRouteHandlers(
  adapter: ClickmapAdapter,
  options: ClickmapRouteHandlersOptions = {},
): ClickmapRouteHandlers {
  return {
    OPTIONS: async () => {
      return withCorsHeaders(new Response(null, { status: 204 }), options.cors);
    },

    GET: async (request) => {
      return handleWithErrorBoundary(request, options, async () => {
        const query = parseQuery(new URL(request.url).searchParams);
        const events = await adapter.load(query);
        return jsonResponse({ events }, 200);
      });
    },

    POST: async (request) => {
      return handleWithErrorBoundary(request, options, async () => {
        const events = await parseEventsFromRequest(request);
        await adapter.save(events);
        return jsonResponse({ ok: true, saved: events.length }, 202);
      });
    },

    DELETE: async (request) => {
      return handleWithErrorBoundary(request, options, async () => {
        if (!adapter.deleteEvents) {
          return jsonResponse({ error: "Adapter does not implement deleteEvents" }, 405);
        }

        const query = parseQuery(new URL(request.url).searchParams);
        const deleted = await adapter.deleteEvents(query);
        return jsonResponse({ ok: true, deleted }, 200);
      });
    },
  };
}
