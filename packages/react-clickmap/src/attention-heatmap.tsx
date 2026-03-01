"use client";

import { useEffect, useMemo, useRef } from "react";
import { createRenderer, DEFAULT_GRADIENT, type GradientMap } from "./render";
import { toAttentionRenderPoints } from "./render/attention";
import type { ClickmapAdapter, HeatmapQuery } from "./types";
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
}: AttentionHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<ReturnType<typeof createRenderer> | null>(null);

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
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      rendererRef.current?.resize(canvas.width, canvas.height);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(document.documentElement);
    window.addEventListener("resize", resize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    if (!rendererRef.current) {
      rendererRef.current = createRenderer(canvas, { preferWebGL: true });
    }

    rendererRef.current.render(toAttentionRenderPoints(data), {
      mode: "heatmap",
      width: canvas.width,
      height: canvas.height,
      radius,
      opacity,
      gradient,
    });

    return () => {
      rendererRef.current?.clear();
    };
  }, [data, gradient, opacity, radius]);

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
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex,
      }}
      aria-label="react-clickmap-attention-overlay"
    />
  );
}
