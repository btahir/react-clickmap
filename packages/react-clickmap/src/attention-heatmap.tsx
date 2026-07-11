"use client";

import { useEffect, useMemo, useRef } from "react";
import { createRenderer, DEFAULT_GRADIENT, type GradientMap } from "./render";
import { toAttentionRenderPoints } from "./render/attention";
import type { ClickmapAdapter, CoordinateSpace, HeatmapQuery } from "./types";
import { useHeatmapData } from "./use-heatmap-data";

export interface AttentionHeatmapProps {
  adapter: ClickmapAdapter;
  page?: string;
  routeKey?: string;
  device?: "all" | "desktop" | "tablet" | "mobile";
  opacity?: number;
  radius?: number;
  gradient?: GradientMap;
  zIndex?: number;
  className?: string;
  /**
   * Coordinate frame to render in. `"document"` renders a full-page overlay
   * from document-relative coordinates; see `Heatmap` for mounting notes.
   * Defaults to `"viewport"`.
   */
  coordinateSpace?: CoordinateSpace;
}

export function AttentionHeatmap({
  adapter,
  page,
  routeKey,
  device = "all",
  opacity = 0.55,
  radius = 28,
  gradient = DEFAULT_GRADIENT,
  zIndex = 9998,
  className,
  coordinateSpace = "viewport",
}: AttentionHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<ReturnType<typeof createRenderer> | null>(null);
  const drawRef = useRef<() => void>(() => {});
  const useDocumentCanvas = coordinateSpace === "document";

  const query = useMemo<HeatmapQuery>(() => {
    const nextQuery: HeatmapQuery = {
      types: ["pointer-move", "click", "rage-click", "dead-click", "scroll"],
      device,
    };

    if (page) {
      nextQuery.page = page;
    }

    if (routeKey) {
      nextQuery.routeKey = routeKey;
    }

    return nextQuery;
  }, [device, page, routeKey]);

  const { data } = useHeatmapData(adapter, query, true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const resize = (): void => {
      const root = document.documentElement;
      const width = useDocumentCanvas ? root.scrollWidth : window.innerWidth;
      const height = useDocumentCanvas ? root.scrollHeight : window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = useDocumentCanvas ? `${width}px` : "";
      canvas.style.height = useDocumentCanvas ? `${height}px` : "";
      rendererRef.current?.resize(width, height);
      drawRef.current();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(document.documentElement);
    window.addEventListener("resize", resize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [useDocumentCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    if (!rendererRef.current) {
      rendererRef.current = createRenderer(canvas, { preferWebGL: true });
    }

    const points = toAttentionRenderPoints(data, coordinateSpace);

    drawRef.current = (): void => {
      rendererRef.current?.render(points, {
        mode: "heatmap",
        width: canvas.width,
        height: canvas.height,
        radius,
        opacity,
        gradient,
      });
    };

    drawRef.current();

    return () => {
      rendererRef.current?.clear();
    };
  }, [coordinateSpace, data, gradient, opacity, radius]);

  useEffect(() => {
    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: useDocumentCanvas ? "absolute" : "fixed",
        ...(useDocumentCanvas ? { top: 0, left: 0 } : { inset: 0 }),
        pointerEvents: "none",
        zIndex,
      }}
      aria-label="react-clickmap-attention-overlay"
    />
  );
}
