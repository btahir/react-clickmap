import type { CaptureEvent, DeviceType, ScrollEvent } from "../types";
import { clamp } from "../utils/coordinates";
import { createEventId } from "../utils/event-id";
import { throttle } from "../utils/throttle";

export interface ScrollTrackerOptions {
  projectId: string;
  sessionId: string;
  userId: string | undefined;
  deviceType: DeviceType;
  getPathname: () => string;
  getRouteKey: () => string;
  emit: (event: CaptureEvent) => void;
  throttleMs?: number;
}

function createViewportState() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  };
}

export function createScrollTracker(options: ScrollTrackerOptions): () => void {
  const throttleMs = options.throttleMs ?? 200;
  let maxDepth = 0;

  const emitScroll = (): void => {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const depth =
      scrollableHeight <= 0 ? 100 : clamp((window.scrollY / scrollableHeight) * 100, 0, 100);
    maxDepth = Math.max(maxDepth, depth);

    const scrollEvent: ScrollEvent = {
      schemaVersion: 1,
      eventVersion: 1,
      eventId: createEventId(),
      projectId: options.projectId,
      type: "scroll",
      sessionId: options.sessionId,
      userId: options.userId,
      timestamp: Date.now(),
      pathname: options.getPathname(),
      routeKey: options.getRouteKey(),
      deviceType: options.deviceType,
      viewport: createViewportState(),
      depth,
      maxDepth,
    };

    options.emit(scrollEvent);
  };

  const listener = throttle(emitScroll, throttleMs);
  window.addEventListener("scroll", listener, { passive: true });

  return () => {
    window.removeEventListener("scroll", listener);
  };
}
