import { useCallback, useEffect, useState } from "react";
import type { CaptureEvent, ClickmapAdapter, HeatmapQuery } from "./types";

export interface UseHeatmapDataResult {
  data: CaptureEvent[];
  isLoading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

export function useHeatmapData(
  adapter: ClickmapAdapter,
  query: HeatmapQuery,
  enabled = true,
): UseHeatmapDataResult {
  const [data, setData] = useState<CaptureEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    if (!enabled) {
      setData([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const events = await adapter.load(query);
      setData(events);
    } catch (caught) {
      const normalized =
        caught instanceof Error ? caught : new Error("Failed to load heatmap data");
      setError(normalized);
    } finally {
      setIsLoading(false);
    }
  }, [adapter, enabled, query]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, isLoading, error, reload };
}
