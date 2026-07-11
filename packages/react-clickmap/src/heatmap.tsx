"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { ElementClickOverlay } from "./element-click-overlay";
import { createRenderer, DEFAULT_GRADIENT, type GradientMap } from "./render";
import { summarizeScrollDepth, toRenderPoints } from "./render/normalize";
import type { ClickmapAdapter, CoordinateSpace, HeatmapQuery } from "./types";
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
  /**
   * Coordinate frame to render in.
   * - `"viewport"` (default): a `position: fixed` overlay sized to the
   *   viewport — correct for above-the-fold heatmaps (zero behavior change).
   * - `"document"`: a `position: absolute` overlay spanning the full document
   *   height, with points placed from document-relative coordinates. Mount
   *   `<Heatmap>` in a non-`position: relative` container (e.g. directly in
   *   `body`) so the overlay aligns with the document origin. Events captured
   *   before document coordinates existed are skipped in this mode.
   */
  coordinateSpace?: CoordinateSpace;
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
    coordinateSpace = "viewport",
  }: HeatmapProps,
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<ReturnType<typeof createRenderer> | null>(null);
  // Holds the latest draw closure so the resize handler can repaint the
  // current points after the canvas is re-sized (important in document mode
  // where the overlay tracks the full, changing document height).
  const drawRef = useRef<() => void>(() => {});

  // Scrollmap remains a viewport band visualization; only the pixel heatmaps
  // honor document-space full-page rendering.
  const useDocumentCanvas = coordinateSpace === "document" && type !== "scrollmap";

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

    const points = toRenderPoints(data, coordinateSpace);

    drawRef.current = (): void => {
      rendererRef.current?.render(points, {
        // scrollmap is handled by the early return above; here `type` is
        // always a pixel-heatmap mode.
        mode: type,
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
  }, [coordinateSpace, data, gradient, opacity, radius, type]);

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
          position: useDocumentCanvas ? "absolute" : "fixed",
          ...(useDocumentCanvas ? { top: 0, left: 0 } : { inset: 0 }),
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
          coordinateSpace={coordinateSpace}
        />
      ) : null}
    </>
  );
});
