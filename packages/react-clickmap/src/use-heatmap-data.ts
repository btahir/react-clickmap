"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CaptureEvent, ClickmapAdapter, HeatmapQuery } from "./types";

export interface UseHeatmapDataResult {
  data: CaptureEvent[];
  isLoading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

function serializeQuery(query: HeatmapQuery): string {
  const entries = Object.entries(query)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return JSON.stringify(entries);
}

export function useHeatmapData(
  adapter: ClickmapAdapter,
  query: HeatmapQuery,
  enabled = true,
): UseHeatmapDataResult {
  const generation = useRef(0);
  const [data, setData] = useState<CaptureEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Inline query object literals get a new identity on every render. Reading
  // the latest query through a ref -- while keying `reload`'s memoization off
  // a content-based serialization -- prevents an infinite refetch loop when
  // callers pass a non-memoized query object.
  const queryRef = useRef(query);
  queryRef.current = query;
  const queryKey = useMemo(() => serializeQuery(query), [query]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: queryKey (a content-based serialization of `query`) is the intentional dependency in place of `query`'s identity -- see queryRef above.
  const reload = useCallback(async (): Promise<void> => {
    const request = ++generation.current;
    if (!enabled) {
      setData([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const events = await adapter.load(queryRef.current);
      if (request === generation.current) setData(events);
    } catch (caught) {
      const normalized =
        caught instanceof Error ? caught : new Error("Failed to load heatmap data");
      if (request === generation.current) setError(normalized);
    } finally {
      if (request === generation.current) setIsLoading(false);
    }
  }, [adapter, enabled, queryKey]);

  useEffect(() => {
    void reload();
    return () => {
      generation.current++;
    };
  }, [reload]);

  return { data, isLoading, error, reload };
}
