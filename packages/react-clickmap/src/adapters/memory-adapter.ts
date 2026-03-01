import type { CaptureEvent, ClickmapAdapter, HeatmapQuery } from "../types";

function matchesQuery(event: CaptureEvent, query: HeatmapQuery): boolean {
  if (query.page && event.pathname !== query.page) {
    return false;
  }

  if (query.routeKey && event.routeKey !== query.routeKey) {
    return false;
  }

  if (query.sessionId && event.sessionId !== query.sessionId) {
    return false;
  }

  if (query.projectId && event.projectId !== query.projectId) {
    return false;
  }

  if (query.userId && event.userId !== query.userId) {
    return false;
  }

  if (query.device && query.device !== "all" && event.deviceType !== query.device) {
    return false;
  }

  if (query.types && query.types.length > 0 && !query.types.includes(event.type)) {
    return false;
  }

  if (typeof query.from === "number" && event.timestamp < query.from) {
    return false;
  }

  if (typeof query.to === "number" && event.timestamp > query.to) {
    return false;
  }

  return true;
}

export interface MemoryAdapter extends ClickmapAdapter {
  clear(): void;
  inspect(): CaptureEvent[];
}

export function memoryAdapter(seedEvents: CaptureEvent[] = []): MemoryAdapter {
  const events: CaptureEvent[] = [...seedEvents];

  return {
    capabilities: {
      supportsAggregation: false,
      supportsRetention: false,
      supportsIdempotency: false,
    },

    async save(captureEvents: CaptureEvent[]): Promise<void> {
      events.push(...captureEvents);
    },

    async load(query: HeatmapQuery): Promise<CaptureEvent[]> {
      const filtered = events.filter((event) => matchesQuery(event, query));
      if (!query.limit || query.limit <= 0) {
        return filtered;
      }

      return filtered.slice(-query.limit);
    },

    async deleteEvents(query: HeatmapQuery): Promise<number> {
      const before = events.length;
      const kept = events.filter((event) => !matchesQuery(event, query));
      events.length = 0;
      events.push(...kept);
      return before - kept.length;
    },

    clear(): void {
      events.length = 0;
    },

    inspect(): CaptureEvent[] {
      return [...events];
    },
  };
}
