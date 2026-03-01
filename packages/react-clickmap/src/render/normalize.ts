import type { CaptureEvent } from "../types";
import type { RenderPoint } from "./types";

export function toRenderPoints(events: CaptureEvent[]): RenderPoint[] {
  const pointWeights = new Map<string, { x: number; y: number; weight: number }>();

  for (const event of events) {
    if (event.type === "scroll") {
      continue;
    }

    const x = Math.round(event.x * 10) / 10;
    const y = Math.round(event.y * 10) / 10;
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
