import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

  it("does not refetch when an inline query literal is content-equal across renders", async () => {
    const adapter = memoryAdapter();
    await adapter.save([createEvent({ pathname: "/docs" })]);
    const loadSpy = vi.spyOn(adapter, "load");

    const { result, rerender } = renderHook(
      ({ page }: { page: string }) => useHeatmapData(adapter, { page }),
      { initialProps: { page: "/docs" } },
    );

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
    });

    expect(loadSpy).toHaveBeenCalledTimes(1);

    // Re-render several times with a brand-new (but content-equal) inline
    // query object. Prior to the fix this re-ran `reload` on every render.
    rerender({ page: "/docs" });
    rerender({ page: "/docs" });
    rerender({ page: "/docs" });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(loadSpy).toHaveBeenCalledTimes(1);

    // A genuine query change must still trigger a refetch.
    rerender({ page: "/pricing" });

    await waitFor(() => {
      expect(loadSpy).toHaveBeenCalledTimes(2);
    });
  });
});
