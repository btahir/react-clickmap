export function getCurrentPathname(): string {
  if (typeof window === "undefined") {
    return "/";
  }

  return window.location.pathname;
}

export function getCurrentRouteKey(): string {
  if (typeof window === "undefined") {
    return "/";
  }

  return `${window.location.pathname}${window.location.search}`;
}

type RouteChangeListener = () => void;

const routeChangeListeners = new Set<RouteChangeListener>();
let isHistoryPatched = false;
let originalPushState: History["pushState"] | undefined;
let originalReplaceState: History["replaceState"] | undefined;

function notifyRouteChange(): void {
  for (const listener of routeChangeListeners) {
    listener();
  }
}

function patchHistory(): void {
  if (isHistoryPatched || typeof window === "undefined") {
    return;
  }

  const history = window.history;
  originalPushState = history.pushState;
  originalReplaceState = history.replaceState;

  history.pushState = function pushState(...args: Parameters<History["pushState"]>): void {
    originalPushState?.apply(history, args);
    notifyRouteChange();
  };

  history.replaceState = function replaceState(...args: Parameters<History["replaceState"]>): void {
    originalReplaceState?.apply(history, args);
    notifyRouteChange();
  };

  window.addEventListener("popstate", notifyRouteChange);
  window.addEventListener("hashchange", notifyRouteChange);
  isHistoryPatched = true;
}

function unpatchHistory(): void {
  if (!isHistoryPatched || typeof window === "undefined") {
    return;
  }

  const history = window.history;
  if (originalPushState) {
    history.pushState = originalPushState;
  }

  if (originalReplaceState) {
    history.replaceState = originalReplaceState;
  }

  window.removeEventListener("popstate", notifyRouteChange);
  window.removeEventListener("hashchange", notifyRouteChange);
  isHistoryPatched = false;
  originalPushState = undefined;
  originalReplaceState = undefined;
}

export function subscribeRouteChanges(listener: RouteChangeListener): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  patchHistory();
  routeChangeListeners.add(listener);

  return () => {
    routeChangeListeners.delete(listener);
    if (routeChangeListeners.size === 0) {
      unpatchHistory();
    }
  };
}
