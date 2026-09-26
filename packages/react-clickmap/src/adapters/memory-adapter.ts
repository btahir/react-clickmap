import { matchesQuery } from "../contracts";
import type { CaptureEvent, ClickmapAdapter, HeatmapQuery } from "../types";

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
      supportsIdempotency: true,
    },

    async save(captureEvents: CaptureEvent[]): Promise<void> {
      const ids = new Set(events.map((e) => e.eventId));
      events.push(
        ...captureEvents.filter((e) => {
          if (ids.has(e.eventId)) return false;
          ids.add(e.eventId);
          return true;
        }),
      );
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
