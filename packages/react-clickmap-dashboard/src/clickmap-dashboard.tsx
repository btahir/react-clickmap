"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AttentionHeatmap,
  type ClickmapAdapter,
  ComparisonHeatmap,
  type DateRangeInput,
  Heatmap,
  type HeatmapQuery,
  ScrollDepth,
  useHeatmapData,
} from "react-clickmap";
import { buildDashboardSnapshot } from "./metrics";

export type DashboardOverlayMode = "none" | "heatmap" | "comparison" | "attention" | "scroll-depth";

export interface DashboardComparisonRange {
  before: DateRangeInput;
  after: DateRangeInput;
}

export interface ClickmapDashboardProps {
  adapter: ClickmapAdapter;
  page?: string;
  routeKey?: string;
  projectId?: string;
  userId?: string;
  dateRange?: DateRangeInput;
  compareRange?: DashboardComparisonRange;
  device?: "all" | "desktop" | "tablet" | "mobile";
  limit?: number;
  title?: string;
  subtitle?: string;
  className?: string;
  style?: CSSProperties;
  showOverlayControls?: boolean;
  overlayZIndex?: number;
  defaultOverlayMode?: DashboardOverlayMode;
  pollIntervalMs?: number;
}

const rootPanelStyle: CSSProperties = {
  position: "relative",
  borderRadius: 24,
  padding: 24,
  background:
    "radial-gradient(130% 100% at 0% 0%, rgba(73, 179, 255, 0.22), transparent 55%), radial-gradient(90% 100% at 100% 100%, rgba(255, 153, 82, 0.2), transparent 48%), linear-gradient(160deg, #071324 0%, #0b1b2f 46%, #151426 100%)",
  border: "1px solid rgba(147, 206, 255, 0.24)",
  boxShadow: "0 24px 80px rgba(3, 12, 30, 0.52), inset 0 1px 0 rgba(255, 255, 255, 0.16)",
  color: "#edf5ff",
  fontFamily: "'Avenir Next', 'Segoe UI', 'IBM Plex Sans', sans-serif",
  overflow: "hidden",
};

const headingStyle: CSSProperties = {
  margin: 0,
  fontSize: 28,
  lineHeight: 1,
  letterSpacing: "0.04em",
  fontFamily: "'Avenir Next Condensed', 'Franklin Gothic Medium', 'Segoe UI', sans-serif",
  textTransform: "uppercase",
};

const chipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "6px 10px",
  border: "1px solid rgba(147, 206, 255, 0.32)",
  background: "rgba(9, 20, 36, 0.58)",
  color: "#cbe8ff",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.02em",
};

const panelStyle: CSSProperties = {
  borderRadius: 16,
  padding: 16,
  border: "1px solid rgba(150, 204, 255, 0.18)",
  background: "rgba(4, 10, 20, 0.44)",
  backdropFilter: "blur(5px)",
};

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

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function OverlayControlButton({
  children,
  active,
  onClick,
  disabled,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: active
          ? "1px solid rgba(124, 222, 186, 0.9)"
          : "1px solid rgba(145, 205, 255, 0.34)",
        background: active
          ? "linear-gradient(135deg, rgba(24, 52, 41, 0.92), rgba(22, 87, 70, 0.8))"
          : "linear-gradient(135deg, rgba(9, 20, 36, 0.72), rgba(8, 13, 22, 0.7))",
        color: disabled ? "rgba(200, 223, 248, 0.45)" : "#e5f4ff",
        borderRadius: 10,
        padding: "8px 10px",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {children}
    </button>
  );
}

export function ClickmapDashboard({
  adapter,
  page,
  routeKey,
  projectId,
  userId,
  dateRange,
  compareRange,
  device = "all",
  limit,
  title = "React-Clickmap Dashboard",
  subtitle = "Live behavior intelligence without cloud lock-in",
  className,
  style,
  showOverlayControls = true,
  overlayZIndex = 12000,
  defaultOverlayMode = "none",
  pollIntervalMs = 0,
}: ClickmapDashboardProps) {
  const query = useMemo<HeatmapQuery>(() => {
    const nextQuery: HeatmapQuery = {
      device,
    };

    if (page) {
      nextQuery.page = page;
    }

    if (routeKey) {
      nextQuery.routeKey = routeKey;
    }

    if (projectId) {
      nextQuery.projectId = projectId;
    }

    if (userId) {
      nextQuery.userId = userId;
    }

    if (typeof limit === "number" && limit > 0) {
      nextQuery.limit = Math.floor(limit);
    }

    const from = toTimestamp(dateRange?.from);
    if (typeof from === "number") {
      nextQuery.from = from;
    }

    const to = toTimestamp(dateRange?.to);
    if (typeof to === "number") {
      nextQuery.to = to;
    }

    return nextQuery;
  }, [dateRange?.from, dateRange?.to, device, limit, page, projectId, routeKey, userId]);

  const { data, error, isLoading, reload } = useHeatmapData(adapter, query, true);
  const snapshot = useMemo(() => buildDashboardSnapshot(data), [data]);
  const [overlayMode, setOverlayMode] = useState<DashboardOverlayMode>(defaultOverlayMode);

  useEffect(() => {
    if (pollIntervalMs <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      void reload();
    }, pollIntervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [pollIntervalMs, reload]);

  useEffect(() => {
    if (overlayMode === "comparison" && !compareRange) {
      setOverlayMode("none");
    }
  }, [compareRange, overlayMode]);

  const maxTimelineCount = snapshot.timeline.reduce(
    (max, bucket) => Math.max(max, bucket.count),
    0,
  );
  const overlayLocationProps = {
    ...(page ? { page } : {}),
    ...(routeKey ? { routeKey } : {}),
  };

  return (
    <section className={className} style={{ ...rootPanelStyle, ...style }}>
      <div
        aria-hidden
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(90deg, rgba(115, 180, 244, 0.06) 0, rgba(115, 180, 244, 0.06) 1px, transparent 1px, transparent 24px)",
          opacity: 0.24,
        }}
      />

      <header
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div>
          <h2 style={headingStyle}>{title}</h2>
          <p
            style={{
              margin: "8px 0 0",
              color: "rgba(217, 235, 255, 0.88)",
              fontSize: 14,
            }}
          >
            {subtitle}
          </p>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={chipStyle}>{routeKey ?? page ?? "all-routes"}</span>
            <span style={chipStyle}>{device}</span>
            {isLoading ? <span style={chipStyle}>refreshing</span> : null}
            {error ? (
              <span
                style={{ ...chipStyle, borderColor: "rgba(255, 125, 125, 0.6)", color: "#ffcdcd" }}
              >
                degraded
              </span>
            ) : null}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              void reload();
            }}
            style={{
              border: "1px solid rgba(147, 206, 255, 0.42)",
              borderRadius: 10,
              padding: "9px 12px",
              background: "rgba(8, 18, 32, 0.68)",
              color: "#dff1ff",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </header>

      {showOverlayControls ? (
        <div
          style={{
            position: "relative",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <OverlayControlButton
            active={overlayMode === "none"}
            onClick={() => setOverlayMode("none")}
          >
            Overlay Off
          </OverlayControlButton>
          <OverlayControlButton
            active={overlayMode === "heatmap"}
            onClick={() => setOverlayMode("heatmap")}
          >
            Heatmap
          </OverlayControlButton>
          <OverlayControlButton
            active={overlayMode === "attention"}
            onClick={() => setOverlayMode("attention")}
          >
            Attention
          </OverlayControlButton>
          <OverlayControlButton
            active={overlayMode === "comparison"}
            onClick={() => setOverlayMode("comparison")}
            disabled={!compareRange}
          >
            Compare
          </OverlayControlButton>
          <OverlayControlButton
            active={overlayMode === "scroll-depth"}
            onClick={() => setOverlayMode("scroll-depth")}
          >
            Scroll
          </OverlayControlButton>
        </div>
      ) : null}

      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        {[
          { label: "Total Events", value: formatNumber(snapshot.totalEvents), accent: "#8ad6ff" },
          { label: "Sessions", value: formatNumber(snapshot.uniqueSessions), accent: "#9cf6c9" },
          { label: "Rage Rate", value: formatPercent(snapshot.rageRate), accent: "#ffb271" },
          { label: "Dead Rate", value: formatPercent(snapshot.deadRate), accent: "#ffc975" },
          {
            label: "Avg Scroll Depth",
            value: formatPercent(snapshot.averageScrollDepth / 100),
            accent: "#caa8ff",
          },
          { label: "Known Users", value: formatNumber(snapshot.uniqueUsers), accent: "#95f5ff" },
        ].map((item) => (
          <article key={item.label} style={panelStyle}>
            <div
              style={{
                height: 2,
                width: "100%",
                borderRadius: 999,
                background: `linear-gradient(90deg, ${item.accent}, transparent)`,
                marginBottom: 10,
              }}
            />
            <p
              style={{
                margin: 0,
                opacity: 0.8,
                fontSize: 12,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {item.label}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 700 }}>{item.value}</p>
          </article>
        ))}
      </div>

      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 10,
        }}
      >
        <article style={panelStyle}>
          <h3
            style={{
              margin: "0 0 12px",
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Event Mix
          </h3>
          {[
            ["Clicks", snapshot.clickEvents, "#7ac6ff"],
            ["Rage Clicks", snapshot.rageClicks, "#ff9962"],
            ["Dead Clicks", snapshot.deadClicks, "#ffc463"],
            ["Scroll", snapshot.scrollEvents, "#bda1ff"],
            ["Pointer Move", snapshot.pointerMoves, "#84f4c8"],
          ].map(([label, value, color]) => {
            const numericValue = value as number;
            const ratio = snapshot.totalEvents > 0 ? numericValue / snapshot.totalEvents : 0;

            return (
              <div key={label as string} style={{ marginBottom: 8 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    marginBottom: 4,
                    opacity: 0.92,
                  }}
                >
                  <span>{label as string}</span>
                  <span>
                    {formatNumber(numericValue)} ({formatPercent(ratio)})
                  </span>
                </div>
                <div
                  style={{ height: 8, borderRadius: 999, background: "rgba(125, 170, 216, 0.12)" }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.max(3, Math.round(ratio * 100))}%`,
                      borderRadius: 999,
                      background: `linear-gradient(90deg, ${color as string}, rgba(255,255,255,0.08))`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </article>

        <article style={panelStyle}>
          <h3
            style={{
              margin: "0 0 12px",
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Device Distribution
          </h3>
          {snapshot.deviceMix.map((row) => (
            <div key={row.device} style={{ marginBottom: 8 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                <span>{row.device}</span>
                <span>
                  {formatNumber(row.count)} ({formatPercent(row.ratio)})
                </span>
              </div>
              <div
                style={{ height: 8, borderRadius: 999, background: "rgba(125, 170, 216, 0.12)" }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.max(3, Math.round(row.ratio * 100))}%`,
                    borderRadius: 999,
                    background: "linear-gradient(90deg, #6fe9b4, rgba(255, 255, 255, 0.2))",
                  }}
                />
              </div>
            </div>
          ))}
        </article>

        <article style={panelStyle}>
          <h3
            style={{
              margin: "0 0 12px",
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Top Pages
          </h3>
          {snapshot.topPages.length === 0 ? (
            <p style={{ margin: 0, color: "rgba(205, 223, 245, 0.8)", fontSize: 13 }}>
              No data yet.
            </p>
          ) : (
            snapshot.topPages.map((pageSummary) => (
              <div
                key={pageSummary.pathname}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <code
                  style={{
                    fontSize: 12,
                    color: "#d9ecff",
                    fontFamily: "'IBM Plex Mono', 'SFMono-Regular', Menlo, monospace",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "75%",
                  }}
                >
                  {pageSummary.pathname}
                </code>
                <span style={chipStyle}>{formatNumber(pageSummary.count)}</span>
              </div>
            ))
          )}
        </article>

        <article style={panelStyle}>
          <h3
            style={{
              margin: "0 0 12px",
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Element Hotspots
          </h3>
          {snapshot.topElements.length === 0 ? (
            <p style={{ margin: 0, color: "rgba(205, 223, 245, 0.8)", fontSize: 13 }}>
              Capture selector data to populate this panel.
            </p>
          ) : (
            snapshot.topElements.map((element) => (
              <div
                key={element.selector}
                style={{
                  marginBottom: 10,
                  paddingBottom: 8,
                  borderBottom: "1px solid rgba(146, 202, 255, 0.12)",
                }}
              >
                <code
                  style={{
                    fontSize: 11,
                    color: "#d6ebff",
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginBottom: 4,
                    fontFamily: "'IBM Plex Mono', 'SFMono-Regular', Menlo, monospace",
                  }}
                >
                  {element.selector}
                </code>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={chipStyle}>{element.total} total</span>
                  <span style={chipStyle}>{element.rageClicks} rage</span>
                  <span style={chipStyle}>{element.deadClicks} dead</span>
                </div>
              </div>
            ))
          )}
        </article>

        <article style={{ ...panelStyle, gridColumn: "1 / -1" }}>
          <h3
            style={{
              margin: "0 0 12px",
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Hourly Activity
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(24, minmax(8px, 1fr))",
              gap: 4,
              alignItems: "end",
              minHeight: 90,
            }}
          >
            {snapshot.timeline.map((bucket) => {
              const ratio = maxTimelineCount > 0 ? bucket.count / maxTimelineCount : 0;

              return (
                <div
                  key={bucket.hour}
                  title={`${bucket.hour} • ${bucket.count}`}
                  style={{
                    height: `${Math.max(8, Math.round(ratio * 100))}%`,
                    borderRadius: 8,
                    background:
                      bucket.count > 0
                        ? "linear-gradient(180deg, rgba(117, 231, 186, 0.95), rgba(92, 163, 255, 0.72))"
                        : "rgba(136, 180, 225, 0.12)",
                  }}
                />
              );
            })}
          </div>
        </article>
      </div>

      {error ? (
        <p style={{ marginTop: 14, color: "#ffd0d0", fontSize: 13 }}>
          Data source error: {error.message}. Check your adapter/endpoint configuration.
        </p>
      ) : null}

      {overlayMode !== "none" ? (
        <button
          type="button"
          onClick={() => setOverlayMode("none")}
          style={{
            position: "fixed",
            top: 18,
            right: 18,
            zIndex: overlayZIndex + 5,
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: 999,
            padding: "8px 12px",
            background: "rgba(8, 14, 24, 0.82)",
            color: "#ffffff",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Close Overlay
        </button>
      ) : null}

      {overlayMode === "heatmap" ? (
        <Heatmap
          adapter={adapter}
          {...overlayLocationProps}
          {...(dateRange ? { dateRange } : {})}
          device={device}
          showElementClicks
          zIndex={overlayZIndex}
        />
      ) : null}

      {overlayMode === "attention" ? (
        <AttentionHeatmap
          adapter={adapter}
          {...overlayLocationProps}
          device={device}
          zIndex={overlayZIndex}
        />
      ) : null}

      {overlayMode === "comparison" && compareRange ? (
        <ComparisonHeatmap
          adapter={adapter}
          {...overlayLocationProps}
          device={device}
          beforeDateRange={compareRange.before}
          afterDateRange={compareRange.after}
          zIndex={overlayZIndex}
        />
      ) : null}

      {overlayMode === "scroll-depth" ? (
        <ScrollDepth adapter={adapter} {...overlayLocationProps} zIndex={overlayZIndex} />
      ) : null}
    </section>
  );
}
