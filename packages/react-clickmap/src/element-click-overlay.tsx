"use client";

import { useEffect, useMemo, useState } from "react";
import { aggregateElementClicks, type ElementClickSummary } from "./render/element-clicks";
import type { CaptureEvent, CoordinateSpace } from "./types";

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
  /**
   * `"viewport"` (default) pins badges over on-screen elements with a
   * `position: fixed` layer. `"document"` places badges over elements
   * anywhere in the document (they scroll with the page).
   */
  coordinateSpace?: CoordinateSpace;
}

function findElement(selector: string, requireInViewport: boolean): Element | null {
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
      requireInViewport &&
      (rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth)
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
  coordinateSpace: CoordinateSpace,
): PositionedSummary[] {
  const positioned: PositionedSummary[] = [];
  const documentSpace = coordinateSpace === "document";

  for (const summary of summaries) {
    if (summary.total < minClicks) {
      continue;
    }

    const element = findElement(summary.selector, !documentSpace);
    if (!element) {
      continue;
    }

    const rect = element.getBoundingClientRect();
    // In document space, positions are absolute (element offset within the
    // whole document) so badges scroll with the page. In viewport space they
    // are viewport-relative for a fixed overlay.
    const scrollTop = documentSpace ? window.scrollY : 0;
    const scrollLeft = documentSpace ? window.scrollX : 0;
    positioned.push({
      ...summary,
      top: Math.max(8, rect.top + scrollTop + 4),
      left: Math.max(8, rect.left + scrollLeft + 4),
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
  coordinateSpace = "viewport",
}: ElementClickOverlayProps) {
  const summaries = useMemo(() => aggregateElementClicks(events), [events]);
  const [badges, setBadges] = useState<PositionedSummary[]>([]);
  const documentSpace = coordinateSpace === "document";

  useEffect(() => {
    const update = (): void => {
      setBadges(toPositionedSummaries(summaries, maxBadges, minClicks, coordinateSpace));
    };

    update();
    window.addEventListener("resize", update);
    // In document space, badges are absolutely positioned and scroll with the
    // page, so there's no need to reposition on every scroll frame.
    if (!documentSpace) {
      window.addEventListener("scroll", update, { passive: true });
    }

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [coordinateSpace, documentSpace, maxBadges, minClicks, summaries]);

  if (badges.length === 0) {
    return null;
  }

  return (
    <div
      className={className}
      style={{
        position: documentSpace ? "absolute" : "fixed",
        ...(documentSpace ? { top: 0, left: 0, width: "100%" } : { inset: 0 }),
        pointerEvents: "none",
        zIndex,
      }}
    >
      {badges.map((badge) => (
        <div
          key={badge.selector}
          style={{
            position: documentSpace ? "absolute" : "fixed",
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
