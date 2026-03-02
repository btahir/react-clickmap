import { describe, expect, it } from "vitest";
import { buildDashboardSnapshot } from "../src/metrics";
import type { CaptureEvent } from "react-clickmap";

function makeEvent(overrides: Partial<CaptureEvent> & { type: CaptureEvent["type"] }): CaptureEvent {
  const base = {
    schemaVersion: 1 as const,
    eventVersion: 1 as const,
    eventId: `evt-${Math.random().toString(36).slice(2, 8)}`,
    projectId: "proj-1",
    sessionId: "sess-1",
    timestamp: new Date("2026-03-01T10:00:00Z").getTime(),
    pathname: "/home",
    routeKey: "/home",
    deviceType: "desktop" as const,
    viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: 0 },
  };

  switch (overrides.type) {
    case "scroll":
      return { ...base, type: "scroll", depth: 50, maxDepth: 75, ...overrides } as CaptureEvent;
    case "pointer-move":
      return { ...base, type: "pointer-move", x: 50, y: 50, pointerType: "mouse" as const, ...overrides } as CaptureEvent;
    case "rage-click":
      return { ...base, type: "rage-click", x: 50, y: 50, pointerType: "mouse" as const, selector: "button", clusterSize: 4, windowMs: 500, radiusPx: 30, ...overrides } as CaptureEvent;
    case "dead-click":
      return { ...base, type: "dead-click", x: 50, y: 50, pointerType: "mouse" as const, reason: "non-interactive-target" as const, ...overrides } as CaptureEvent;
    default:
      return { ...base, type: "click", x: 50, y: 50, pointerType: "mouse" as const, ...overrides } as CaptureEvent;
  }
}

describe("buildDashboardSnapshot", () => {
  it("returns zeroed snapshot for empty events", () => {
    const snapshot = buildDashboardSnapshot([]);

    expect(snapshot.totalEvents).toBe(0);
    expect(snapshot.clickEvents).toBe(0);
    expect(snapshot.uniqueSessions).toBe(0);
    expect(snapshot.rageRate).toBe(0);
    expect(snapshot.deadRate).toBe(0);
    expect(snapshot.averageScrollDepth).toBe(0);
    expect(snapshot.timeline).toHaveLength(24);
  });

  it("counts event types correctly", () => {
    const events = [
      makeEvent({ type: "click" }),
      makeEvent({ type: "click" }),
      makeEvent({ type: "rage-click" }),
      makeEvent({ type: "dead-click" }),
      makeEvent({ type: "scroll" }),
      makeEvent({ type: "pointer-move" }),
    ];

    const snapshot = buildDashboardSnapshot(events);

    expect(snapshot.totalEvents).toBe(6);
    expect(snapshot.clickEvents).toBe(2);
    expect(snapshot.rageClicks).toBe(1);
    expect(snapshot.deadClicks).toBe(1);
    expect(snapshot.scrollEvents).toBe(1);
    expect(snapshot.pointerMoves).toBe(1);
  });

  it("calculates rage and dead click rates", () => {
    const events = [
      makeEvent({ type: "click" }),
      makeEvent({ type: "click" }),
      makeEvent({ type: "rage-click" }),
      makeEvent({ type: "dead-click" }),
    ];

    const snapshot = buildDashboardSnapshot(events);

    // totalClickLike = 2 clicks + 1 rage + 1 dead = 4
    expect(snapshot.rageRate).toBeCloseTo(0.25);
    expect(snapshot.deadRate).toBeCloseTo(0.25);
  });

  it("tracks unique sessions and users", () => {
    const events = [
      makeEvent({ type: "click", sessionId: "sess-1", userId: "user-a" }),
      makeEvent({ type: "click", sessionId: "sess-1", userId: "user-a" }),
      makeEvent({ type: "click", sessionId: "sess-2", userId: "user-b" }),
      makeEvent({ type: "click", sessionId: "sess-3" }),
    ];

    const snapshot = buildDashboardSnapshot(events);

    expect(snapshot.uniqueSessions).toBe(3);
    expect(snapshot.uniqueUsers).toBe(2);
  });

  it("averages scroll depth from maxDepth", () => {
    const events = [
      makeEvent({ type: "scroll", maxDepth: 60 }),
      makeEvent({ type: "scroll", maxDepth: 80 }),
      makeEvent({ type: "scroll", maxDepth: 100 }),
    ];

    const snapshot = buildDashboardSnapshot(events);

    expect(snapshot.averageScrollDepth).toBeCloseTo(80);
  });

  it("groups events into device mix", () => {
    const events = [
      makeEvent({ type: "click", deviceType: "desktop" }),
      makeEvent({ type: "click", deviceType: "desktop" }),
      makeEvent({ type: "click", deviceType: "mobile" }),
    ];

    const snapshot = buildDashboardSnapshot(events);

    const desktop = snapshot.deviceMix.find((d) => d.device === "desktop");
    const mobile = snapshot.deviceMix.find((d) => d.device === "mobile");
    expect(desktop?.count).toBe(2);
    expect(mobile?.count).toBe(1);
    expect(desktop?.ratio).toBeCloseTo(2 / 3);
  });

  it("produces top pages sorted by count", () => {
    const events = [
      makeEvent({ type: "click", pathname: "/about" }),
      makeEvent({ type: "click", pathname: "/home" }),
      makeEvent({ type: "click", pathname: "/home" }),
      makeEvent({ type: "click", pathname: "/home" }),
    ];

    const snapshot = buildDashboardSnapshot(events);

    expect(snapshot.topPages[0]!.pathname).toBe("/home");
    expect(snapshot.topPages[0]!.count).toBe(3);
    expect(snapshot.topPages[1]!.pathname).toBe("/about");
  });

  it("populates 24-hour timeline buckets", () => {
    // Use a fixed timestamp and derive the expected local hour from it
    const timestamp = new Date("2026-03-01T10:30:00Z").getTime();
    const expectedHour = new Date(timestamp).getHours();
    const hourLabel = `${String(expectedHour).padStart(2, "0")}:00`;

    const events = [
      makeEvent({ type: "click", timestamp }),
      makeEvent({ type: "click", timestamp }),
    ];

    const snapshot = buildDashboardSnapshot(events);

    expect(snapshot.timeline).toHaveLength(24);
    const bucket = snapshot.timeline.find((t) => t.hour === hourLabel);
    expect(bucket?.count).toBe(2);
  });
});
