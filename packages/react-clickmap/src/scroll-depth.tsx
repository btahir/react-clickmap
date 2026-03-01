"use client";

import { useMemo } from "react";
import { summarizeScrollDepth } from "./render/normalize";
import type { ClickmapAdapter, HeatmapQuery } from "./types";
import { useHeatmapData } from "./use-heatmap-data";

export interface ScrollDepthProps {
  adapter: ClickmapAdapter;
  page?: string;
  routeKey?: string;
  showPercentages?: boolean;
  width?: number;
  zIndex?: number;
}

export function ScrollDepth({
  adapter,
  page,
  routeKey,
  showPercentages = true,
  width = 14,
  zIndex = 9999,
}: ScrollDepthProps) {
  const query = useMemo<HeatmapQuery>(() => {
    const nextQuery: HeatmapQuery = {
      types: ["scroll"],
    };

    if (page) {
      nextQuery.page = page;
    }

    if (routeKey) {
      nextQuery.routeKey = routeKey;
    }

    return nextQuery;
  }, [page, routeKey]);

  const { data } = useHeatmapData(adapter, query, true);
  const bands = summarizeScrollDepth(data);

  return (
    <aside
      aria-label="react-clickmap-scroll-depth"
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width,
        zIndex,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {bands.map((band) => {
        const hue = 220 - band.ratio * 220;

        return (
          <div
            key={band.depth}
            title={showPercentages ? `${Math.round(band.ratio * 100)}% reached` : undefined}
            style={{
              flex: 1,
              backgroundColor: `hsla(${hue}, 90%, 55%, ${0.15 + band.ratio * 0.8})`,
            }}
          />
        );
      })}
    </aside>
  );
}
