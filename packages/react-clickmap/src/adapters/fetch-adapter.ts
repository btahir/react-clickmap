import type { CaptureEvent, ClickmapAdapter, HeatmapQuery } from "../types";

export interface FetchAdapterOptions {
  endpoint: string;
  loadEndpoint?: string;
  deleteEndpoint?: string;
  headers?: HeadersInit;
  fetchImpl?: typeof fetch;
  preferBeacon?: boolean;
  keepalive?: boolean;
  maxPayloadBytes?: number;
}

const DEFAULT_MAX_KEEPALIVE_BYTES = 64 * 1024;

function encodeQuery(query: HeatmapQuery): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      searchParams.set(key, value.join(","));
      continue;
    }

    searchParams.set(key, String(value));
  }

  return searchParams.toString();
}

function splitBySize(events: CaptureEvent[], maxPayloadBytes: number): CaptureEvent[][] {
  const chunks: CaptureEvent[][] = [];
  let currentChunk: CaptureEvent[] = [];

  const flushChunk = (): void => {
    if (currentChunk.length === 0) {
      return;
    }

    chunks.push(currentChunk);
    currentChunk = [];
  };

  for (const event of events) {
    const candidate = currentChunk.concat(event);
    const byteLength = new Blob([JSON.stringify({ events: candidate })]).size;

    if (byteLength > maxPayloadBytes && currentChunk.length > 0) {
      flushChunk();
      currentChunk.push(event);
      continue;
    }

    currentChunk = candidate;
  }

  flushChunk();
  return chunks;
}

export function fetchAdapter(options: FetchAdapterOptions): ClickmapAdapter {
  const fetchImpl = options.fetchImpl ?? fetch;
  const preferBeacon = options.preferBeacon ?? true;
  const keepalive = options.keepalive ?? true;
  const maxPayloadBytes = options.maxPayloadBytes ?? DEFAULT_MAX_KEEPALIVE_BYTES;

  return {
    capabilities: {
      supportsAggregation: false,
      supportsRetention: false,
      supportsIdempotency: false,
    },

    async save(events: CaptureEvent[]): Promise<void> {
      if (events.length === 0) {
        return;
      }

      const chunks = splitBySize(events, maxPayloadBytes);

      for (const chunk of chunks) {
        const payload = JSON.stringify({ events: chunk });
        const payloadSize = new Blob([payload]).size;

        if (
          preferBeacon &&
          typeof navigator !== "undefined" &&
          typeof navigator.sendBeacon === "function" &&
          payloadSize <= maxPayloadBytes
        ) {
          const asBlob = new Blob([payload], { type: "application/json" });
          const sent = navigator.sendBeacon(options.endpoint, asBlob);
          if (sent) {
            continue;
          }
        }

        await fetchImpl(options.endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...options.headers,
          },
          keepalive,
          body: payload,
        });
      }
    },

    async load(query: HeatmapQuery): Promise<CaptureEvent[]> {
      const queryString = encodeQuery(query);
      const endpoint = options.loadEndpoint ?? options.endpoint;
      const url = queryString ? `${endpoint}?${queryString}` : endpoint;

      const requestInit: RequestInit = {
        method: "GET",
      };

      if (options.headers) {
        requestInit.headers = options.headers;
      }

      const response = await fetchImpl(url, requestInit);

      if (!response.ok) {
        throw new Error(`Failed to load clickmap events. Status: ${response.status}`);
      }

      const payload = (await response.json()) as { events?: CaptureEvent[] } | CaptureEvent[];
      if (Array.isArray(payload)) {
        return payload;
      }

      return payload.events ?? [];
    },

    async deleteEvents(query: HeatmapQuery): Promise<number> {
      const queryString = encodeQuery(query);
      const endpoint = options.deleteEndpoint ?? options.loadEndpoint ?? options.endpoint;
      const url = queryString ? `${endpoint}?${queryString}` : endpoint;

      const requestInit: RequestInit = {
        method: "DELETE",
      };

      if (options.headers) {
        requestInit.headers = options.headers;
      }

      const response = await fetchImpl(url, requestInit);
      if (!response.ok) {
        throw new Error(`Failed to delete clickmap events. Status: ${response.status}`);
      }

      const payload = (await response.json()) as { deleted?: number } | null;
      return payload?.deleted ?? 0;
    },
  };
}
