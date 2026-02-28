import { useEffect, useMemo, useRef } from 'react';
import { useHeatmapData } from './use-heatmap-data';
import type { ClickmapAdapter, HeatmapQuery } from './types';
import { createRenderer, DEFAULT_GRADIENT, type GradientMap } from './render';
import { summarizeScrollDepth, toRenderPoints } from './render/normalize';

export type HeatmapType = 'heatmap' | 'clickmap' | 'scrollmap';

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
  device?: 'all' | 'desktop' | 'tablet' | 'mobile';
  opacity?: number;
  radius?: number;
  gradient?: GradientMap;
  interactive?: boolean;
  zIndex?: number;
  className?: string;
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
  opacity: number
): void {
  const context = canvas.getContext('2d');
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

export function Heatmap({
  adapter,
  page,
  routeKey,
  type = 'heatmap',
  dateRange,
  device = 'all',
  opacity = 0.6,
  radius = 25,
  gradient = DEFAULT_GRADIENT,
  interactive = false,
  zIndex = 9999,
  className
}: HeatmapProps): JSX.Element {
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
    if (typeof from === 'number') {
      nextQuery.from = from;
    }

    const to = toTimestamp(dateRange?.to);
    if (typeof to === 'number') {
      nextQuery.to = to;
    }

    nextQuery.device = device;

    return nextQuery;
  }, [dateRange?.from, dateRange?.to, device, page, routeKey]);

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
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    if (type === 'scrollmap') {
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
      gradient
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
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: interactive ? 'auto' : 'none',
        zIndex
      }}
      aria-label="react-clickmap-overlay"
    />
  );
}
