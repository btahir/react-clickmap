import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { memoryAdapter } from "../src/adapters/memory-adapter";
import { useHeatmapData } from "../src/use-heatmap-data";
import { createEvent } from "./fixtures";

describe("useHeatmapData", () => {
  it("loads data from adapter", async () => {
    const adapter = memoryAdapter();
    await adapter.save([createEvent({ pathname: "/docs" })]);
    const query = { page: "/docs" };

    const { result } = renderHook(() => useHeatmapData(adapter, query));

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
