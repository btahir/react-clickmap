import type { CaptureEvent } from "../types";
import { summarizeScrollDepth } from "./normalize";
import type { RenderPoint } from "./types";

function baseAttentionWeight(event: CaptureEvent): number {
  if (event.type === "pointer-move") {
    return 0.6;
  }

  if (event.type === "click") {
    return 1;
  }

  if (event.type === "dead-click") {
    return 1.2;
  }

  if (event.type === "rage-click") {
    return 2;
  }

  return 0;
}

export function toAttentionRenderPoints(events: CaptureEvent[]): RenderPoint[] {
  const scrollProfile = summarizeScrollDepth(events);
  const attentionPoints = new Map<string, { x: number; y: number; weight: number }>();

  for (const event of events) {
    if (event.type === "scroll") {
      continue;
    }

    if (!("x" in event) || !("y" in event)) {
      continue;
    }

    const x = Math.round(event.x * 10) / 10;
    const y = Math.round(event.y * 10) / 10;
    const key = `${x}:${y}`;
    const bandIndex = Math.min(
      Math.max(0, scrollProfile.length - 1),
      Math.floor(event.y / (100 / Math.max(1, scrollProfile.length))),
    );
    const band = scrollProfile[bandIndex];
    const bandBoost = 0.5 + (band?.ratio ?? 0.15) * 2;
    const weight = baseAttentionWeight(event) * bandBoost;

    const current = attentionPoints.get(key);
    if (!current) {
      attentionPoints.set(key, { x, y, weight });
      continue;
    }

    current.weight += weight;
  }

  const points = Array.from(attentionPoints.values());
  const maxWeight = points.reduce((max, point) => Math.max(max, point.weight), 0);

  return points.map((point) => ({
    x: point.x,
    y: point.y,
    weight: maxWeight > 0 ? point.weight / maxWeight : 0,
  }));
}
