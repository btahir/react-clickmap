import type { CaptureEvent, CoordinateSpace } from "../types";
import type { RenderPoint } from "./types";

/**
 * Resolve the coordinate pair to render an event at for the requested
 * coordinate space. In `document` mode, events that predate document-relative
 * capture (no `docX`/`docY`) return `undefined` and are skipped by callers.
 */
export function resolveCoordinates(
  event: CaptureEvent,
  coordinateSpace: CoordinateSpace,
): { x: number; y: number } | undefined {
  if (event.type === "scroll") {
    return undefined;
  }

  if (coordinateSpace === "document") {
    if (typeof event.docX !== "number" || typeof event.docY !== "number") {
      return undefined;
    }

    return { x: event.docX, y: event.docY };
  }

  return { x: event.x, y: event.y };
}

export function toRenderPoints(
  events: CaptureEvent[],
  coordinateSpace: CoordinateSpace = "viewport",
): RenderPoint[] {
  const pointWeights = new Map<string, { x: number; y: number; weight: number }>();

  for (const event of events) {
    const coordinates = resolveCoordinates(event, coordinateSpace);
    if (!coordinates) {
      continue;
    }

    const x = Math.round(coordinates.x * 10) / 10;
    const y = Math.round(coordinates.y * 10) / 10;
    const key = `${x}:${y}`;
    const current = pointWeights.get(key);
    const increment = event.type === "rage-click" ? 2 : 1;

    if (!current) {
      pointWeights.set(key, { x, y, weight: increment });
      continue;
    }

    current.weight += increment;
  }

  const points = Array.from(pointWeights.values());
  const maxWeight = points.reduce((max, point) => Math.max(max, point.weight), 0);

  return points.map((point) => ({
    x: point.x,
    y: point.y,
    weight: maxWeight > 0 ? point.weight / maxWeight : 0,
  }));
}

export function summarizeScrollDepth(
  events: CaptureEvent[],
): Array<{ depth: number; ratio: number }> {
  const scrollEvents = events.filter((event) => event.type === "scroll");
  if (scrollEvents.length === 0) {
    return [];
  }

  const bands = 10;
  const histogram = Array.from({ length: bands }, () => 0);

  for (const event of scrollEvents) {
    const index = Math.min(bands - 1, Math.floor(event.maxDepth / (100 / bands)));
    histogram[index] += 1;
  }

  const total = histogram.reduce((sum, count) => sum + count, 0);
  if (total === 0) {
    return [];
  }

  return histogram.map((count, index) => ({
    depth: index * (100 / bands),
    ratio: count / total,
  }));
}
