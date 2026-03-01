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
    return Array.isArray(parsed) ? (parsed as CaptureEvent[]) : [];
  } catch {
    return [];
  }
}

function writeEvents(key: string, events: CaptureEvent[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(events));
  } catch {
    // ignore storage write failures in constrained environments
  }
}

export function localStorageAdapter(options: LocalStorageAdapterOptions = {}): ClickmapAdapter {
  const key = options.key ?? DEFAULT_STORAGE_KEY;
  const fallback = memoryAdapter();

  return {
    async save(events: CaptureEvent[]): Promise<void> {
      if (typeof window === "undefined") {
        await fallback.save(events);
        return;
      }

      const existing = readEvents(key);
      writeEvents(key, existing.concat(events));
    },

    async load(query: HeatmapQuery): Promise<CaptureEvent[]> {
      if (typeof window === "undefined") {
        return fallback.load(query);
      }

      const mem = memoryAdapter(readEvents(key));
      return mem.load(query);
    },
  };
}
