"use client";

import { useEffect, useMemo, useRef } from "react";
import { createRenderer, DEFAULT_GRADIENT, type GradientMap } from "./render";
import { toRenderPoints } from "./render/normalize";
import type { ClickmapAdapter, HeatmapQuery } from "./types";
import { useHeatmapData } from "./use-heatmap-data";

export interface HeatmapThumbnailProps {
  adapter: ClickmapAdapter;
  page?: string;
  routeKey?: string;
  width?: number;
  height?: number;
  radius?: number;
  opacity?: number;
  gradient?: GradientMap;
  className?: string;
}

export function HeatmapThumbnail({
  adapter,
  page,
  routeKey,
  width = 300,
  height = 200,
  radius = 18,
  opacity = 0.7,
  gradient = DEFAULT_GRADIENT,
  className,
}: HeatmapThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<ReturnType<typeof createRenderer> | null>(null);

  const query = useMemo<HeatmapQuery>(() => {
    const nextQuery: HeatmapQuery = {};

    if (page) {
      nextQuery.page = page;
    }

    if (routeKey) {
      nextQuery.routeKey = routeKey;
    }

    return nextQuery;
  }, [page, routeKey]);

  const { data } = useHeatmapData(adapter, query, true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    rendererRef.current = createRenderer(canvas, { preferWebGL: false });

    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) {
      return;
    }

    const points = toRenderPoints(data);

    renderer.render(points, {
      mode: "heatmap",
      width,
      height,
      radius,
      opacity,
      gradient,
    });
  }, [data, gradient, height, opacity, radius, width]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      aria-label="react-clickmap-thumbnail"
    />
  );
}
