import type { CaptureEvent, DeviceType, PointerMoveEvent, PointerType } from "../types";
import { toViewportPercentages } from "../utils/coordinates";
import { matchesAnySelector } from "../utils/element-selector";
import { createEventId } from "../utils/event-id";

export interface PointerMoveTrackerOptions {
  projectId: string;
  sessionId: string;
  userId: string | undefined;
  deviceType: DeviceType;
  getPathname: () => string;
  getRouteKey: () => string;
  emit: (event: CaptureEvent) => void;
  sampleIntervalMs?: number;
  ignoreSelectors?: string[];
}

function createViewportState() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  };
}

function normalizePointerType(pointerType: string): PointerType {
  if (pointerType === "mouse" || pointerType === "touch" || pointerType === "pen") {
    return pointerType;
  }

  return "unknown";
}

export function createPointerMoveTracker(options: PointerMoveTrackerOptions): () => void {
  const sampleIntervalMs = options.sampleIntervalMs ?? 100;
  const ignoreSelectors = options.ignoreSelectors ?? [];
  let lastSampleAt = 0;

  const listener = (event: PointerEvent): void => {
    if (event.isPrimary === false) {
      return;
    }

    const now = Date.now();
    if (now - lastSampleAt < sampleIntervalMs) {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    if (target && matchesAnySelector(target, ignoreSelectors)) {
      return;
    }

    lastSampleAt = now;

    const coordinates = toViewportPercentages(
      event.clientX,
      event.clientY,
      window.innerWidth,
      window.innerHeight,
    );

    const pointerMoveEvent: PointerMoveEvent = {
      schemaVersion: 1,
      eventVersion: 1,
      eventId: createEventId(),
      projectId: options.projectId,
      type: "pointer-move",
      sessionId: options.sessionId,
      userId: options.userId,
      timestamp: now,
      pathname: options.getPathname(),
      routeKey: options.getRouteKey(),
      deviceType: options.deviceType,
      viewport: createViewportState(),
      x: coordinates.x,
      y: coordinates.y,
      pointerType: normalizePointerType(event.pointerType),
    };

    options.emit(pointerMoveEvent);
  };

  window.addEventListener("pointermove", listener, { passive: true });

  return () => {
    window.removeEventListener("pointermove", listener);
  };
}
