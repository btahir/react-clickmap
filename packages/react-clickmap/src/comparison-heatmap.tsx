"use client";

import type { DateRangeInput, HeatmapProps, HeatmapType } from "./heatmap";
import { Heatmap } from "./heatmap";
import { DEFAULT_GRADIENT, type GradientMap } from "./render";

const BEFORE_GRADIENT: GradientMap = {
  0: "#0b6cff",
  0.5: "#4ac6ff",
  1: "#b6f3ff",
};

const AFTER_GRADIENT: GradientMap = {
  0: "#ffd166",
  0.5: "#ff7b54",
  1: "#ff2d55",
};

export interface ComparisonHeatmapProps {
  adapter: HeatmapProps["adapter"];
  page?: string;
  routeKey?: string;
  device?: HeatmapProps["device"];
  type?: Exclude<HeatmapType, "scrollmap">;
  beforeDateRange: DateRangeInput;
  afterDateRange: DateRangeInput;
  radius?: number;
  beforeOpacity?: number;
  afterOpacity?: number;
  beforeGradient?: GradientMap;
  afterGradient?: GradientMap;
  zIndex?: number;
  className?: string;
}

export function ComparisonHeatmap({
  adapter,
  page,
  routeKey,
  device = "all",
  type = "heatmap",
  beforeDateRange,
  afterDateRange,
  radius = 24,
  beforeOpacity = 0.38,
  afterOpacity = 0.58,
  beforeGradient = BEFORE_GRADIENT,
  afterGradient = AFTER_GRADIENT,
  zIndex = 9996,
  className,
}: ComparisonHeatmapProps) {
  const sharedProps = {
    adapter,
    device,
    type,
    radius,
    ...(page ? { page } : {}),
    ...(routeKey ? { routeKey } : {}),
    ...(className ? { className } : {}),
  };

  return (
    <>
      <Heatmap
        {...sharedProps}
        dateRange={beforeDateRange}
        opacity={beforeOpacity}
        gradient={beforeGradient ?? DEFAULT_GRADIENT}
        zIndex={zIndex}
      />
      <Heatmap
        {...sharedProps}
        dateRange={afterDateRange}
        opacity={afterOpacity}
        gradient={afterGradient ?? DEFAULT_GRADIENT}
        zIndex={zIndex + 1}
      />
      <aside
        aria-label="react-clickmap-comparison-legend"
        style={{
          position: "fixed",
          bottom: 18,
          left: 18,
          zIndex: zIndex + 2,
          pointerEvents: "none",
          borderRadius: 10,
          padding: "8px 10px",
          background: "rgba(4, 10, 24, 0.82)",
          border: "1px solid rgba(255, 255, 255, 0.16)",
          color: "#eff4ff",
          fontSize: 12,
          lineHeight: 1.3,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }}
      >
        <div style={{ color: "#9fd9ff" }}>Blue: Before</div>
        <div style={{ color: "#ff9b8a" }}>Warm: After</div>
      </aside>
    </>
  );
}
