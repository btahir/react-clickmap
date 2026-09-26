"use client";
import { useSyncExternalStore } from "react";
import { type ClickmapAdapter, fetchAdapter } from "react-clickmap";
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

export interface UseNextRouteKeyOptions {
  includeSearch?: boolean;
  fallbackPathname?: string;
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
  const includeSearch = options.includeSearch ?? false;
  const fallbackPathname = options.fallbackPathname ?? "/";

  return useSyncExternalStore(
    subscribeRouteKey,
    () => resolveRouteKey(includeSearch, fallbackPathname),
    () => fallbackPathname,
  );
}
