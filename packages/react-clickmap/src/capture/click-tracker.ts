import type { CaptureEvent, ClickEvent, DeviceType, PointerType, RageClickEvent } from '../types';
import { getElementSelector, matchesAnySelector } from '../utils/element-selector';
import { toViewportPercentages } from '../utils/coordinates';

interface RageClickPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface ClickTrackerOptions {
  sessionId: string;
  deviceType: DeviceType;
  getPathname: () => string;
  getRouteKey: () => string;
  emit: (event: CaptureEvent) => void;
  ignoreSelectors?: string[];
  maskSelectors?: string[];
  enableRageClicks?: boolean;
  rageClickThreshold?: number;
  rageClickWindowMs?: number;
  rageClickRadiusPx?: number;
}

function toPointerType(pointerType: string): PointerType {
  if (pointerType === 'mouse' || pointerType === 'touch' || pointerType === 'pen') {
    return pointerType;
  }

  return 'unknown';
}

function createViewportState() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY
  };
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
      window.innerHeight
    );

    const pointerType = toPointerType(event.pointerType);
    const selector = getElementSelector(targetElement, { maskSelectors });

    const clickEvent: ClickEvent = {
      schemaVersion: 1,
      eventVersion: 1,
      type: 'click',
      sessionId: options.sessionId,
      timestamp: now,
      pathname: options.getPathname(),
      routeKey: options.getRouteKey(),
      deviceType: options.deviceType,
      viewport: createViewportState(),
      x: coordinates.x,
      y: coordinates.y,
      pointerType,
      selector
    };

    options.emit(clickEvent);

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
      type: 'rage-click',
      sessionId: options.sessionId,
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
      radiusPx: rageClickRadiusPx
    };

    options.emit(rageEvent);
  };

  window.addEventListener('pointerup', listener, { passive: true });

  return () => {
    window.removeEventListener('pointerup', listener);
  };
}
