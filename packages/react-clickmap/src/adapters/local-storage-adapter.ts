import { validateEvents } from "../contracts";
import type { CaptureEvent, ClickmapAdapter, HeatmapQuery } from "../types";
import { memoryAdapter } from "./memory-adapter";

export interface LocalStorageAdapterOptions {
  key?: string;
}

const DEFAULT_STORAGE_KEY = "react-clickmap:events";

function readEvents(key: string): CaptureEvent[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return validateEvents(parsed, 100000);
  } catch (error) {
    throw new Error("Clickmap local store is unreadable; preserve it before recovery", {
      cause: error,
    });
  }
}

function writeEvents(key: string, events: CaptureEvent[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(events));
  } catch (error) {
    throw new Error("Clickmap local store write failed", { cause: error });
  }
}

export function localStorageAdapter(options: LocalStorageAdapterOptions = {}): ClickmapAdapter {
  const key = options.key ?? DEFAULT_STORAGE_KEY;
  const fallback = memoryAdapter();

  return {
    capabilities: {
      supportsAggregation: false,
      supportsRetention: false,
      supportsIdempotency: true,
    },

    async save(events: CaptureEvent[]): Promise<void> {
      if (typeof window === "undefined") {
        await fallback.save(events);
        return;
      }

      const existing = readEvents(key);
      const mem = memoryAdapter(existing);
      await mem.save(events);
      if (mem.inspect().length > 100000) throw new Error("Clickmap local store limit reached");
      writeEvents(key, mem.inspect());
    },

    async load(query: HeatmapQuery): Promise<CaptureEvent[]> {
      if (typeof window === "undefined") {
        return fallback.load(query);
      }

      const mem = memoryAdapter(readEvents(key));
      return mem.load(query);
    },

    async deleteEvents(query: HeatmapQuery): Promise<number> {
      if (typeof window === "undefined") {
        return fallback.deleteEvents ? fallback.deleteEvents(query) : 0;
      }

      const mem = memoryAdapter(readEvents(key));
      const removed = mem.deleteEvents ? await mem.deleteEvents(query) : 0;
      writeEvents(key, mem.inspect());
      return removed;
    },
  };
}
