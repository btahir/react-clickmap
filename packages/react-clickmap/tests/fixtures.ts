import type { CaptureEvent } from "../src/types";

export function createEvent(partial: Partial<CaptureEvent> = {}): CaptureEvent {
  return {
    schemaVersion: 1,
    eventVersion: 1,
    eventId: "018f4f00-1234-7abc-8def-0123456789ab",
    projectId: "project-default",
    type: "click",
    sessionId: "session-1",
    timestamp: 1000,
    pathname: "/pricing",
    routeKey: "/pricing",
    deviceType: "desktop",
    viewport: {
      width: 1000,
      height: 800,
      scrollX: 0,
      scrollY: 0,
    },
    x: 30,
    y: 40,
    pointerType: "mouse",
    ...partial,
  } as CaptureEvent;
}
