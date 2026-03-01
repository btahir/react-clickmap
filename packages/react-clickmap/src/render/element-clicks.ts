import type { CaptureEvent } from "../types";

export interface ElementClickSummary {
  selector: string;
  clicks: number;
  rageClicks: number;
  deadClicks: number;
  total: number;
}

export function aggregateElementClicks(events: CaptureEvent[]): ElementClickSummary[] {
  const counts = new Map<string, ElementClickSummary>();

  for (const event of events) {
    if (
      (event.type !== "click" && event.type !== "rage-click" && event.type !== "dead-click") ||
      !("selector" in event) ||
      !event.selector
    ) {
      continue;
    }

    const current = counts.get(event.selector) ?? {
      selector: event.selector,
      clicks: 0,
      rageClicks: 0,
      deadClicks: 0,
      total: 0,
    };

    if (event.type === "click") {
      current.clicks += 1;
    } else if (event.type === "rage-click") {
      current.rageClicks += 1;
    } else {
      current.deadClicks += 1;
    }

    current.total += 1;
    counts.set(event.selector, current);
  }

  return Array.from(counts.values()).sort((left, right) => right.total - left.total);
}
