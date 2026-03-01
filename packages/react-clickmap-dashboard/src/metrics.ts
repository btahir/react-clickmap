import { aggregateElementClicks, type CaptureEvent, type DeviceType } from "react-clickmap";

export interface DashboardTimelineBucket {
  hour: string;
  count: number;
}

export interface DashboardDeviceMix {
  device: DeviceType;
  count: number;
  ratio: number;
}

export interface DashboardPageSummary {
  pathname: string;
  count: number;
}

export interface DashboardSessionSummary {
  sessionId: string;
  count: number;
  lastTimestamp: number;
}

export interface DashboardSnapshot {
  totalEvents: number;
  clickEvents: number;
  rageClicks: number;
  deadClicks: number;
  scrollEvents: number;
  pointerMoves: number;
  uniqueSessions: number;
  uniqueUsers: number;
  averageScrollDepth: number;
  rageRate: number;
  deadRate: number;
  deviceMix: DashboardDeviceMix[];
  topPages: DashboardPageSummary[];
  topSessions: DashboardSessionSummary[];
  timeline: DashboardTimelineBucket[];
  topElements: ReturnType<typeof aggregateElementClicks>;
}

function toHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function topByCount<T>(
  entries: Iterable<[string, T]>,
  selectCount: (value: T) => number,
  limit: number,
): Array<[string, T]> {
  return Array.from(entries)
    .sort((left, right) => selectCount(right[1]) - selectCount(left[1]))
    .slice(0, limit);
}

export function buildDashboardSnapshot(events: CaptureEvent[]): DashboardSnapshot {
  let clickEvents = 0;
  let rageClicks = 0;
  let deadClicks = 0;
  let scrollEvents = 0;
  let pointerMoves = 0;
  let scrollDepthTotal = 0;
  let scrollDepthCount = 0;

  const sessionIds = new Set<string>();
  const userIds = new Set<string>();
  const deviceCounts = new Map<DeviceType, number>([
    ["desktop", 0],
    ["tablet", 0],
    ["mobile", 0],
  ]);
  const pageCounts = new Map<string, number>();
  const sessionCounts = new Map<string, DashboardSessionSummary>();
  const timelineByHour = new Map<number, number>();

  for (const event of events) {
    sessionIds.add(event.sessionId);
    if (event.userId) {
      userIds.add(event.userId);
    }

    deviceCounts.set(event.deviceType, (deviceCounts.get(event.deviceType) ?? 0) + 1);
    pageCounts.set(event.pathname, (pageCounts.get(event.pathname) ?? 0) + 1);

    const existingSession = sessionCounts.get(event.sessionId);
    if (!existingSession) {
      sessionCounts.set(event.sessionId, {
        sessionId: event.sessionId,
        count: 1,
        lastTimestamp: event.timestamp,
      });
    } else {
      existingSession.count += 1;
      if (event.timestamp > existingSession.lastTimestamp) {
        existingSession.lastTimestamp = event.timestamp;
      }
    }

    const hour = new Date(event.timestamp).getHours();
    timelineByHour.set(hour, (timelineByHour.get(hour) ?? 0) + 1);

    switch (event.type) {
      case "click":
        clickEvents += 1;
        break;
      case "rage-click":
        rageClicks += 1;
        break;
      case "dead-click":
        deadClicks += 1;
        break;
      case "scroll":
        scrollEvents += 1;
        scrollDepthTotal += event.maxDepth;
        scrollDepthCount += 1;
        break;
      case "pointer-move":
        pointerMoves += 1;
        break;
      default:
        break;
    }
  }

  const totalClickLike = clickEvents + rageClicks + deadClicks;
  const totalEvents = events.length;

  const deviceMix: DashboardDeviceMix[] = Array.from(deviceCounts.entries())
    .map(([device, count]) => ({
      device,
      count,
      ratio: totalEvents > 0 ? count / totalEvents : 0,
    }))
    .sort((left, right) => right.count - left.count);

  const topPages = topByCount(pageCounts.entries(), (count) => count, 6).map(
    ([pathname, count]) => ({
      pathname,
      count,
    }),
  );

  const topSessions = topByCount(sessionCounts.entries(), (session) => session.count, 6).map(
    ([, session]) => session,
  );

  const timeline: DashboardTimelineBucket[] = Array.from({ length: 24 }, (_, hour) => ({
    hour: toHourLabel(hour),
    count: timelineByHour.get(hour) ?? 0,
  }));

  return {
    totalEvents,
    clickEvents,
    rageClicks,
    deadClicks,
    scrollEvents,
    pointerMoves,
    uniqueSessions: sessionIds.size,
    uniqueUsers: userIds.size,
    averageScrollDepth: scrollDepthCount > 0 ? scrollDepthTotal / scrollDepthCount : 0,
    rageRate: totalClickLike > 0 ? rageClicks / totalClickLike : 0,
    deadRate: totalClickLike > 0 ? deadClicks / totalClickLike : 0,
    deviceMix,
    topPages,
    topSessions,
    timeline,
    topElements: aggregateElementClicks(events).slice(0, 8),
  };
}
