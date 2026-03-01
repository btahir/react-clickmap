"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { ElementClickOverlay } from "./element-click-overlay";
import { createRenderer, DEFAULT_GRADIENT, type GradientMap } from "./render";
import { summarizeScrollDepth, toRenderPoints } from "./render/normalize";
import type { ClickmapAdapter, HeatmapQuery } from "./types";
import { useHeatmapData } from "./use-heatmap-data";

export type HeatmapType = "heatmap" | "clickmap" | "scrollmap";

export interface DateRangeInput {
  from?: string | Date;
  to?: string | Date;
}

export interface HeatmapProps {
  adapter: ClickmapAdapter;
  page?: string;
  routeKey?: string;
  type?: HeatmapType;
  dateRange?: DateRangeInput;
  device?: "all" | "desktop" | "tablet" | "mobile";
  opacity?: number;
  radius?: number;
  gradient?: GradientMap;
  interactive?: boolean;
  zIndex?: number;
  className?: string;
  showElementClicks?: boolean;
  elementClickMaxBadges?: number;
  elementClickMinClicks?: number;
}

export interface HeatmapHandle {
  toDataUrl: (type?: string, quality?: number) => string | null;
  toBlob: (type?: string, quality?: number) => Promise<Blob | null>;
  download: (filename?: string, type?: string, quality?: number) => Promise<boolean>;
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  const parts = dataUrl.split(",");
  const meta = parts[0];
  const encoded = parts[1];
  if (!meta || !encoded) {
    return null;
  }

  const mimeMatch = /data:(.*?);base64/.exec(meta);
  const mime = mimeMatch?.[1] ?? "image/png";

  try {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

function toTimestamp(input: string | Date | undefined): number | undefined {
  if (!input) {
    return undefined;
  }

  if (input instanceof Date) {
    return input.getTime();
  }

  const parsed = Date.parse(input);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function drawScrollmap(
  canvas: HTMLCanvasElement,
  bands: Array<{ depth: number; ratio: number }>,
  opacity: number,
): void {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  const bandHeight = canvas.height / Math.max(1, bands.length);

  for (let index = 0; index < bands.length; index += 1) {
    const band = bands[index];
    if (!band) {
      continue;
    }

    const hue = 220 - band.ratio * 220;
    context.fillStyle = `hsla(${hue}, 90%, 55%, ${Math.min(1, opacity * (0.3 + band.ratio))})`;
    context.fillRect(0, index * bandHeight, canvas.width, bandHeight);
  }
}

export const Heatmap = forwardRef<HeatmapHandle, HeatmapProps>(function Heatmap(
  {
    adapter,
    page,
    routeKey,
    type = "heatmap",
    dateRange,
    device = "all",
    opacity = 0.6,
    radius = 25,
    gradient = DEFAULT_GRADIENT,
    interactive = false,
    zIndex = 9999,
    className,
    showElementClicks = false,
    elementClickMaxBadges = 20,
    elementClickMinClicks = 1,
  }: HeatmapProps,
  ref,
) {
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

    const from = toTimestamp(dateRange?.from);
    if (typeof from === "number") {
      nextQuery.from = from;
    }

    const to = toTimestamp(dateRange?.to);
    if (typeof to === "number") {
      nextQuery.to = to;
    }

    nextQuery.device = device;

    return nextQuery;
  }, [dateRange?.from, dateRange?.to, device, page, routeKey]);

  const { data } = useHeatmapData(adapter, query, true);

  useImperativeHandle(ref, () => ({
    toDataUrl: (exportType = "image/png", quality = 0.92) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return null;
      }

      try {
        return canvas.toDataURL(exportType, quality);
      } catch {
        return null;
      }
    },
    toBlob: async (exportType = "image/png", quality = 0.92) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return null;
      }

      if (typeof canvas.toBlob === "function") {
        return new Promise<Blob | null>((resolve) => {
          canvas.toBlob((blob) => resolve(blob), exportType, quality);
        });
      }

      const dataUrl = canvas.toDataURL(exportType, quality);
      return dataUrlToBlob(dataUrl);
    },
    download: async (
      filename = "react-clickmap-export.png",
      exportType = "image/png",
      quality = 0.92,
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return false;
      }

      const blob =
        typeof canvas.toBlob === "function"
          ? await new Promise<Blob | null>((resolve) => {
              canvas.toBlob((nextBlob) => resolve(nextBlob), exportType, quality);
            })
          : dataUrlToBlob(canvas.toDataURL(exportType, quality));

      if (!blob) {
        return false;
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      link.rel = "noopener";
      link.click();
      URL.revokeObjectURL(objectUrl);
      return true;
    },
  }));

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

    if (type === "scrollmap") {
      rendererRef.current?.dispose();
      rendererRef.current = null;
      const bands = summarizeScrollDepth(data);
      drawScrollmap(canvas, bands, opacity);
      return;
    }

    if (!rendererRef.current) {
      rendererRef.current = createRenderer(canvas, { preferWebGL: true });
    }

    const points = toRenderPoints(data);

    rendererRef.current.render(points, {
      mode: type,
      width: canvas.width,
      height: canvas.height,
      radius,
      opacity,
      gradient,
    });

    return () => {
      rendererRef.current?.clear();
    };
  }, [data, gradient, opacity, radius, type]);

  useEffect(() => {
    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className={className}
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: interactive ? "auto" : "none",
          zIndex,
        }}
        aria-label="react-clickmap-overlay"
      />
      {showElementClicks ? (
        <ElementClickOverlay
          events={data}
          zIndex={zIndex + 1}
          maxBadges={elementClickMaxBadges}
          minClicks={elementClickMinClicks}
        />
      ) : null}
    </>
  );
});
