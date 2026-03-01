"use client";

import { useEffect, useMemo, useState } from "react";
import { aggregateElementClicks, type ElementClickSummary } from "./render/element-clicks";
import type { CaptureEvent } from "./types";

interface PositionedSummary extends ElementClickSummary {
  top: number;
  left: number;
}

export interface ElementClickOverlayProps {
  events: CaptureEvent[];
  zIndex?: number;
  maxBadges?: number;
  minClicks?: number;
  className?: string;
}

function findVisibleElement(selector: string): Element | null {
  try {
    const element = document.querySelector(selector);
    if (!element) {
      return null;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    if (
      rect.bottom < 0 ||
      rect.top > window.innerHeight ||
      rect.right < 0 ||
      rect.left > window.innerWidth
    ) {
      return null;
    }

    return element;
  } catch {
    return null;
  }
}

function toPositionedSummaries(
  summaries: ElementClickSummary[],
  maxBadges: number,
  minClicks: number,
): PositionedSummary[] {
  const positioned: PositionedSummary[] = [];

  for (const summary of summaries) {
    if (summary.total < minClicks) {
      continue;
    }

    const element = findVisibleElement(summary.selector);
    if (!element) {
      continue;
    }

    const rect = element.getBoundingClientRect();
    positioned.push({
      ...summary,
      top: Math.max(8, rect.top + 4),
      left: Math.max(8, rect.left + 4),
    });

    if (positioned.length >= maxBadges) {
      break;
    }
  }

  return positioned;
}

export function ElementClickOverlay({
  events,
  zIndex = 10000,
  maxBadges = 20,
  minClicks = 1,
  className,
}: ElementClickOverlayProps) {
  const summaries = useMemo(() => aggregateElementClicks(events), [events]);
  const [badges, setBadges] = useState<PositionedSummary[]>([]);

  useEffect(() => {
    const update = (): void => {
      setBadges(toPositionedSummaries(summaries, maxBadges, minClicks));
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [maxBadges, minClicks, summaries]);

  if (badges.length === 0) {
    return null;
  }

  return (
    <div
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex,
      }}
    >
      {badges.map((badge) => (
        <div
          key={badge.selector}
          style={{
            position: "fixed",
            top: badge.top,
            left: badge.left,
            pointerEvents: "none",
            borderRadius: 999,
            padding: "4px 8px",
            background: "rgba(5, 10, 24, 0.86)",
            color: "#f8fbff",
            border: "1px solid rgba(87, 186, 255, 0.55)",
            fontSize: 12,
            lineHeight: 1,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.35)",
            maxWidth: 180,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={`${badge.total} clicks | rage: ${badge.rageClicks} | dead: ${badge.deadClicks}`}
        >
          {badge.total} clicks
        </div>
      ))}
    </div>
  );
}
