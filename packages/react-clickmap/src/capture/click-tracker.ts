import type {
  CaptureEvent,
  ClickEvent,
  DeadClickEvent,
  DeviceType,
  PointerType,
  RageClickEvent,
} from "../types";
import { toViewportPercentages } from "../utils/coordinates";
import { getElementSelector, matchesAnySelector } from "../utils/element-selector";
import { createEventId } from "../utils/event-id";

interface RageClickPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface ClickTrackerOptions {
  projectId: string;
  sessionId: string;
  userId: string | undefined;
  deviceType: DeviceType;
  getPathname: () => string;
  getRouteKey: () => string;
  emit: (event: CaptureEvent) => void;
  ignoreSelectors?: string[];
  maskSelectors?: string[];
  enableDeadClicks?: boolean;
  enableRageClicks?: boolean;
  rageClickThreshold?: number;
  rageClickWindowMs?: number;
  rageClickRadiusPx?: number;
}

const INTERACTIVE_SELECTOR =
  "a[href],button,input,select,textarea,summary,label[for],[role='button'],[role='link'],[onclick],[data-clickmap-interactive]";

function toPointerType(pointerType: string): PointerType {
  if (pointerType === "mouse" || pointerType === "touch" || pointerType === "pen") {
    return pointerType;
  }

  return "unknown";
}

function createViewportState() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  };
}

function isInteractiveElement(element: Element): boolean {
  if (element instanceof HTMLElement && element.isContentEditable) {
    return true;
  }

  return Boolean(element.closest(INTERACTIVE_SELECTOR));
}

export function createClickTracker(options: ClickTrackerOptions): () => void {
  const ignoreSelectors = options.ignoreSelectors ?? [];
  const maskSelectors = options.maskSelectors ?? [];
  const rageClickThreshold = options.rageClickThreshold ?? 3;
  const rageClickWindowMs = options.rageClickWindowMs ?? 500;
  const rageClickRadiusPx = options.rageClickRadiusPx ?? 30;
  const ragePoints: RageClickPoint[] = [];

  const listener = (event: PointerEvent): void => {
    if (event.button !== 0) {
      return;
    }

    const targetElement = event.target instanceof Element ? event.target : null;
    if (targetElement && matchesAnySelector(targetElement, ignoreSelectors)) {
      return;
    }

    const now = Date.now();
    const coordinates = toViewportPercentages(
      event.clientX,
      event.clientY,
      window.innerWidth,
      window.innerHeight,
    );

    const pointerType = toPointerType(event.pointerType);
    const selector = getElementSelector(targetElement, { maskSelectors });

    const clickEvent: ClickEvent = {
      schemaVersion: 1,
      eventVersion: 1,
      eventId: createEventId(),
      projectId: options.projectId,
      type: "click",
      sessionId: options.sessionId,
      userId: options.userId,
      timestamp: now,
      pathname: options.getPathname(),
      routeKey: options.getRouteKey(),
      deviceType: options.deviceType,
      viewport: createViewportState(),
      x: coordinates.x,
      y: coordinates.y,
      pointerType,
      selector,
    };

    options.emit(clickEvent);

    if (options.enableDeadClicks && targetElement && !isInteractiveElement(targetElement)) {
      const deadClickEvent: DeadClickEvent = {
        schemaVersion: 1,
        eventVersion: 1,
        eventId: createEventId(),
        projectId: options.projectId,
        type: "dead-click",
        sessionId: options.sessionId,
        userId: options.userId,
        timestamp: now,
        pathname: options.getPathname(),
        routeKey: options.getRouteKey(),
        deviceType: options.deviceType,
        viewport: createViewportState(),
        x: coordinates.x,
        y: coordinates.y,
        pointerType,
        selector,
        reason: "non-interactive-target",
      };

      options.emit(deadClickEvent);
    }

    if (!options.enableRageClicks) {
      return;
    }

    ragePoints.push({ x: event.clientX, y: event.clientY, timestamp: now });

    const cutoff = now - rageClickWindowMs;
    while (ragePoints.length > 0 && ragePoints[0] && ragePoints[0].timestamp < cutoff) {
      ragePoints.shift();
    }

    const clusterSize = ragePoints.filter((point) => {
      const distanceX = point.x - event.clientX;
      const distanceY = point.y - event.clientY;
      return Math.hypot(distanceX, distanceY) <= rageClickRadiusPx;
    }).length;

    if (clusterSize < rageClickThreshold) {
      return;
    }

    const rageEvent: RageClickEvent = {
      schemaVersion: 1,
      eventVersion: 1,
      eventId: createEventId(),
      projectId: options.projectId,
      type: "rage-click",
      sessionId: options.sessionId,
      userId: options.userId,
      timestamp: now,
      pathname: options.getPathname(),
      routeKey: options.getRouteKey(),
      deviceType: options.deviceType,
      viewport: createViewportState(),
      x: coordinates.x,
      y: coordinates.y,
      pointerType,
      selector,
      clusterSize,
      windowMs: rageClickWindowMs,
      radiusPx: rageClickRadiusPx,
    };

    options.emit(rageEvent);
  };

  window.addEventListener("pointerup", listener, { passive: true });

  return () => {
    window.removeEventListener("pointerup", listener);
  };
}
