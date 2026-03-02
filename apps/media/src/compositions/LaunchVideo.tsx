import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND, FONT_STACK, MONO_STACK } from "../theme";

type OverlayMode = "heatmap" | "clickmap" | "attention" | "scroll";

const overlayLabels: Array<{ mode: OverlayMode; label: string }> = [
  { mode: "heatmap", label: "Heatmap" },
  { mode: "clickmap", label: "Clickmap" },
  { mode: "attention", label: "Attention" },
  { mode: "scroll", label: "Scroll Depth" },
];

const heatSpots = [
  { x: 0.24, y: 0.34, base: 0.9, phase: 0 },
  { x: 0.42, y: 0.58, base: 0.85, phase: 10 },
  { x: 0.62, y: 0.38, base: 0.95, phase: 22 },
  { x: 0.74, y: 0.62, base: 0.8, phase: 35 },
  { x: 0.53, y: 0.26, base: 0.72, phase: 47 },
  { x: 0.82, y: 0.28, base: 0.62, phase: 58 },
  { x: 0.32, y: 0.74, base: 0.68, phase: 70 },
];

const routeNodes = [
  { x: 0.1, y: 0.55, label: "Capture" },
  { x: 0.33, y: 0.35, label: "Batch" },
  { x: 0.58, y: 0.52, label: "Store" },
  { x: 0.84, y: 0.32, label: "Render" },
  { x: 0.93, y: 0.62, label: "Act" },
];

function sceneTitleOpacity(frame: number, offset = 0): number {
  return interpolate(frame, [offset, offset + 12], [0.72, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
}

function Background({ frame }: { frame: number }) {
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(95% 90% at 0% 0%, rgba(96,165,250,0.24), transparent 52%), radial-gradient(75% 70% at 100% 100%, rgba(94,234,212,0.16), transparent 48%), linear-gradient(155deg, #050915 0%, #09142a 47%, #0b1226 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -40,
          transform: `translate(${Math.sin(frame * 0.012) * 5}px, ${Math.cos(frame * 0.01) * 5}px)`,
          background:
            "repeating-linear-gradient(90deg, rgba(96,165,250,0.08) 0px, rgba(96,165,250,0.08) 1px, transparent 1px, transparent 72px)",
          maskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
        }}
      />
    </AbsoluteFill>
  );
}

function BrowserFrame({
  title,
  mode,
  frame,
  width,
  height,
}: {
  title: string;
  mode: OverlayMode;
  frame: number;
  width: number;
  height: number;
}) {
  const surfaceW = width - 38;
  const surfaceH = height - 126;

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.16)",
        overflow: "hidden",
        background:
          "linear-gradient(170deg, rgba(11,18,38,0.95), rgba(7,11,26,0.94)), radial-gradient(circle at 10% 0%, rgba(96,165,250,0.18), transparent 55%)",
        boxShadow: "0 28px 62px rgba(0,0,0,0.36)",
        position: "relative",
      }}
    >
      <div
        style={{
          height: 56,
          borderBottom: "1px solid rgba(255,255,255,0.10)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 16px",
        }}
      >
        <div style={{ color: "#d7e8ff", fontSize: 20, fontWeight: 600 }}>{title}</div>
        <div style={{ color: "#aac8ff", fontFamily: MONO_STACK, fontSize: 16 }}>mode: {mode}</div>
      </div>

      <div style={{ position: "absolute", left: 19, right: 19, top: 74, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
        {["Events", "Rage", "Dead", "Depth"].map((kpi, index) => (
          <div
            key={kpi}
            style={{
              borderRadius: 11,
              border: "1px solid rgba(147, 190, 255, 0.26)",
              background:
                index % 2 === 0 ? "rgba(11, 20, 40, 0.78)" : "rgba(9, 16, 32, 0.78)",
              padding: "8px 10px",
            }}
          >
            <div style={{ color: "#8ba5d5", fontSize: 11 }}>{kpi}</div>
            <div style={{ color: "#eaf3ff", fontSize: 17, fontWeight: 700 }}>
              {index === 0 ? "2.3M" : index === 1 ? "3.2%" : index === 2 ? "1.4%" : "71%"}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          left: 19,
          top: 128,
          width: surfaceW,
          height: surfaceH,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background:
            "linear-gradient(180deg, rgba(10,18,38,0.88), rgba(8,13,29,0.9)), radial-gradient(circle at 26% 12%, rgba(96,165,250,0.2), transparent 42%)",
          overflow: "hidden",
        }}
      >
        {mode === "scroll"
          ? Array.from({ length: 9 }).map((_, index) => {
              const pulse = (Math.sin(frame * 0.07 + index * 0.8) + 1) * 0.5;
              const ratio = 0.25 + pulse * 0.75;
              const hue = 220 - ratio * 200;
              return (
                <div
                  key={index}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: `${(index / 9) * 100}%`,
                    height: `${100 / 9 - 0.5}%`,
                    background: `hsla(${hue}, 88%, 58%, ${0.18 + ratio * 0.6})`,
                  }}
                />
              );
            })
          : null}

        {(mode === "heatmap" || mode === "attention" || mode === "clickmap") &&
          heatSpots.map((spot) => {
            const wave = 0.55 + ((Math.sin(frame * 0.08 + spot.phase) + 1) * 0.5) * 0.65;
            const weight = spot.base * wave;
            const size = (mode === "clickmap" ? 36 : 120) * spot.base;
            const opacityBase = mode === "attention" ? 0.24 : mode === "clickmap" ? 0.34 : 0.28;

            return (
              <div
                key={`${spot.x}-${spot.y}`}
                style={{
                  position: "absolute",
                  left: `${spot.x * 100}%`,
                  top: `${spot.y * 100}%`,
                  transform: "translate(-50%, -50%)",
                  width: size + (mode === "clickmap" ? 0 : 26 * wave),
                  height: size + (mode === "clickmap" ? 0 : 26 * wave),
                  borderRadius: "50%",
                  background:
                    mode === "clickmap"
                      ? `radial-gradient(circle, rgba(255,241,116,${0.45 * weight}) 0%, rgba(255,112,112,${opacityBase * weight}) 72%, rgba(255,112,112,0) 100%)`
                      : `radial-gradient(circle, rgba(255,106,106,${0.22 * weight}) 0%, rgba(255,209,102,${0.26 * weight}) 34%, rgba(94,234,212,${opacityBase * weight}) 62%, rgba(94,234,212,0) 100%)`,
                  filter: `blur(${mode === "clickmap" ? 1 : 6 - spot.base * 2}px)`,
                }}
              />
            );
          })}

        {mode === "attention"
          ? Array.from({ length: 6 }).map((_, index) => {
              const x = 14 + index * 14 + Math.sin(frame * 0.06 + index * 0.5) * 3;
              const y = 30 + Math.cos(frame * 0.05 + index * 0.7) * 18 + index * 6;
              return (
                <div
                  key={index}
                  style={{
                    position: "absolute",
                    left: `${x}%`,
                    top: `${y}%`,
                    width: 3,
                    height: 3,
                    borderRadius: "50%",
                    boxShadow: "0 0 8px rgba(94,234,212,0.85)",
                    background: "rgba(94,234,212,0.95)",
                  }}
                />
              );
            })
          : null}

        {mode === "clickmap"
          ? Array.from({ length: 10 }).map((_, index) => {
              const x = 18 + index * 7 + Math.sin(frame * 0.11 + index) * 2;
              const y = 62 - (index % 4) * 10 + Math.cos(frame * 0.09 + index) * 2;
              return (
                <div
                  key={index}
                  style={{
                    position: "absolute",
                    left: `${x}%`,
                    top: `${y}%`,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    border: "1px solid rgba(255,120,120,0.82)",
                    background: "rgba(255,217,111,0.35)",
                  }}
                />
              );
            })
          : null}
      </div>
    </div>
  );
}

function ResultFirstScene({ frame }: { frame: number }) {
  const titleIn = sceneTitleOpacity(frame);
  const panelIn = interpolate(frame, [0, 16], [0.84, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ padding: "64px 72px", fontFamily: FONT_STACK, color: BRAND.text }}>
      <div style={{ opacity: titleIn, marginBottom: 24 }}>
        <div style={{ fontSize: 66, fontWeight: 700, lineHeight: 1.04, maxWidth: 920 }}>
          This is what your team sees first.
        </div>
        <div style={{ marginTop: 12, color: BRAND.muted, fontSize: 28, lineHeight: 1.32, maxWidth: 980 }}>
          Live interaction overlays on real UI. No script-tag dashboard theater.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 14,
          transform: `translateY(${interpolate(1 - panelIn, [0, 1], [0, 10])}px)`,
          opacity: panelIn,
        }}
      >
        <BrowserFrame title="/pricing" mode="heatmap" frame={frame} width={1160} height={560} />

        <div
          style={{
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "linear-gradient(165deg, rgba(11,18,38,0.92), rgba(7,11,27,0.94))",
            padding: 16,
            display: "grid",
            gap: 10,
          }}
        >
          {["Rage hotspots", "Dead click zones", "Drop-off sections", "Top CTA friction"].map((item, index) => (
            <div
              key={item}
              style={{
                borderRadius: 12,
                border: "1px solid rgba(148, 196, 255, 0.25)",
                background: index % 2 === 0 ? "rgba(9, 18, 36, 0.8)" : "rgba(9, 16, 30, 0.8)",
                padding: "12px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 22 }}>{item}</span>
              <span
                style={{
                  borderRadius: 999,
                  border: "1px solid rgba(94,234,212,0.52)",
                  padding: "4px 10px",
                  color: "#bcfff5",
                  fontSize: 17,
                  fontFamily: MONO_STACK,
                }}
              >
                {index === 0 ? "+22%" : index === 1 ? "14" : index === 2 ? "71%" : "3"}
              </span>
            </div>
          ))}

          <div
            style={{
              marginTop: 6,
              borderRadius: 12,
              border: "1px solid rgba(94,234,212,0.46)",
              background: "linear-gradient(135deg, rgba(94,234,212,0.16), rgba(96,165,250,0.15))",
              padding: "12px 14px",
              fontSize: 21,
              fontWeight: 700,
            }}
          >
            Insight in under 5 minutes
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function ModeSprintScene({ frame }: { frame: number }) {
  const modeIndex = Math.min(3, Math.floor(frame / 24));
  const mode = overlayLabels[modeIndex]?.mode ?? "heatmap";
  const titleIn = sceneTitleOpacity(frame);

  return (
    <AbsoluteFill style={{ padding: "64px 72px", fontFamily: FONT_STACK, color: BRAND.text }}>
      <div style={{ opacity: titleIn, marginBottom: 20 }}>
        <div style={{ fontSize: 62, fontWeight: 700, lineHeight: 1.05 }}>Fast mode switching.</div>
        <div style={{ marginTop: 10, color: BRAND.muted, fontSize: 27 }}>
          Heatmap, clickmap, attention, and scroll-depth in one workflow.
        </div>
      </div>

      <BrowserFrame title="/signup" mode={mode} frame={frame} width={1760} height={640} />

      <div style={{ position: "absolute", left: 92, bottom: 68, display: "flex", gap: 10 }}>
        {overlayLabels.map((entry, index) => {
          const active = index === modeIndex;
          return (
            <div
              key={entry.mode}
              style={{
                borderRadius: 999,
                border: active
                  ? "1px solid rgba(94,234,212,0.9)"
                  : "1px solid rgba(148,194,255,0.35)",
                background: active ? "rgba(94,234,212,0.18)" : "rgba(9, 18, 36, 0.78)",
                color: active ? "#c8fff7" : "#d2e6ff",
                padding: "8px 14px",
                fontSize: 20,
                fontWeight: 600,
              }}
            >
              {entry.label}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function RouteMapScene({ frame }: { frame: number }) {
  const titleIn = sceneTitleOpacity(frame);

  return (
    <AbsoluteFill style={{ padding: "70px 82px", fontFamily: FONT_STACK, color: BRAND.text }}>
      <div style={{ opacity: titleIn }}>
        <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.07 }}>From interaction to action.</div>
        <div style={{ marginTop: 10, color: BRAND.muted, fontSize: 27, maxWidth: 1060 }}>
          Capture in the browser, persist in your DB, and ship changes based on real friction maps.
        </div>
      </div>

      <div
        style={{
          marginTop: 32,
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.14)",
          background:
            "linear-gradient(170deg, rgba(11,18,38,0.94), rgba(8,13,30,0.92)), radial-gradient(circle at 80% 80%, rgba(94,234,212,0.14), transparent 52%)",
          height: 520,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 1000 520" style={{ position: "absolute", inset: 0 }}>
          {routeNodes.slice(0, -1).map((node, index) => {
            const next = routeNodes[index + 1];
            if (!next) {
              return null;
            }

            return (
              <line
                key={`${node.label}-${next.label}`}
                x1={node.x * 1000}
                y1={node.y * 520}
                x2={next.x * 1000}
                y2={next.y * 520}
                stroke="rgba(111, 185, 255, 0.55)"
                strokeWidth={2}
              />
            );
          })}

          {routeNodes.map((node, index) => {
            const reveal = interpolate(frame, [8 + index * 8, 20 + index * 8], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <g key={node.label} opacity={reveal}>
                <circle
                  cx={node.x * 1000}
                  cy={node.y * 520}
                  r={18}
                  fill="rgba(94,234,212,0.24)"
                  stroke="rgba(94,234,212,0.84)"
                  strokeWidth={2}
                />
                <text
                  x={node.x * 1000}
                  y={node.y * 520 + 48}
                  fill="#d7eaff"
                  fontSize={20}
                  textAnchor="middle"
                  fontFamily={FONT_STACK}
                >
                  {node.label}
                </text>
              </g>
            );
          })}

          <circle
            cx={
              interpolate(frame % 66, [0, 65], [routeNodes[0]!.x, routeNodes[routeNodes.length - 1]!.x]) *
              1000
            }
            cy={
              interpolate(frame % 66, [0, 65], [routeNodes[0]!.y, routeNodes[routeNodes.length - 1]!.y]) *
              520
            }
            r={9}
            fill="rgba(255, 209, 102, 0.95)"
          />
        </svg>

        <div style={{ position: "absolute", right: 18, top: 18, width: 330, display: "grid", gap: 8 }}>
          {["Postgres adapter", "Supabase adapter", "Custom adapter"].map((item, index) => (
            <div
              key={item}
              style={{
                borderRadius: 12,
                border: "1px solid rgba(148, 200, 255, 0.28)",
                background: "rgba(10, 18, 36, 0.82)",
                padding: "10px 12px",
                color: "#d7eaff",
                fontSize: 18,
              }}
            >
              {item}
              <span style={{ float: "right", color: index === 0 ? "#96ffe8" : "#9dc5ff" }}>
                {index === 0 ? "primary" : "ready"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function CTAScene({ frame }: { frame: number }) {
  const { fps } = useVideoConfig();
  const rise = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 28,
  });

  return (
    <AbsoluteFill style={{ padding: "92px", fontFamily: FONT_STACK, color: BRAND.text }}>
      <div
        style={{
          opacity: rise,
          transform: `translateY(${interpolate(1 - rise, [0, 1], [0, 18])}px)`,
          fontSize: 72,
          lineHeight: 1.04,
          fontWeight: 700,
          maxWidth: 1200,
        }}
      >
        Stop guessing.
        <br />
        Start shipping from real behavior.
      </div>

      <div
        style={{
          marginTop: 22,
          color: BRAND.muted,
          fontSize: 31,
          maxWidth: 1050,
          lineHeight: 1.32,
          opacity: rise,
        }}
      >
        React-native clickmaps with zero cloud requirement and full data ownership.
      </div>

      <div
        style={{
          marginTop: 36,
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          borderRadius: 14,
          border: "1px solid rgba(94,234,212,0.72)",
          background: "linear-gradient(135deg, rgba(94,234,212,0.18), rgba(96,165,250,0.16))",
          padding: "14px 22px",
          fontSize: 31,
          fontWeight: 700,
          fontFamily: MONO_STACK,
          opacity: rise,
        }}
      >
        npm install react-clickmap
      </div>
    </AbsoluteFill>
  );
}

const SCENE_TRANSITION_FRAMES = 14;
const RESULT_START = 0;
const MODE_START = 114;
const ROUTE_START = 210;
const CTA_START = 312;
const VIDEO_END = 390;

function getSceneTransitionStyle({
  frame,
  start,
  nextStart,
}: {
  frame: number;
  start: number;
  nextStart: number | null;
}) {
  const fadeIn =
    start === 0
      ? 1
      : interpolate(
          frame,
          [start - SCENE_TRANSITION_FRAMES, start],
          [0, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.inOut(Easing.cubic),
          },
        );

  const fadeOut =
    nextStart === null
      ? 1
      : interpolate(
          frame,
          [nextStart - SCENE_TRANSITION_FRAMES, nextStart],
          [1, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.inOut(Easing.cubic),
          },
        );

  const opacity = fadeIn * fadeOut;
  const inLift = 1 - fadeIn;
  const outLift = 1 - fadeOut;

  return {
    opacity,
    transform: `translateY(${inLift * 18 - outLift * 10}px) scale(${1 - outLift * 0.01})`,
    filter: `blur(${outLift * 1.2}px)`,
  } as const;
}

export const LaunchVideo = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ fontFamily: FONT_STACK, color: BRAND.text }}>
      <Background frame={frame} />

      <Sequence from={RESULT_START} durationInFrames={MODE_START - RESULT_START}>
        <AbsoluteFill style={getSceneTransitionStyle({ frame, start: RESULT_START, nextStart: MODE_START })}>
          <ResultFirstScene frame={frame} />
        </AbsoluteFill>
      </Sequence>

      <Sequence
        from={MODE_START - SCENE_TRANSITION_FRAMES}
        durationInFrames={ROUTE_START - (MODE_START - SCENE_TRANSITION_FRAMES)}
      >
        <AbsoluteFill style={getSceneTransitionStyle({ frame, start: MODE_START, nextStart: ROUTE_START })}>
          <ModeSprintScene frame={frame - MODE_START} />
        </AbsoluteFill>
      </Sequence>

      <Sequence
        from={ROUTE_START - SCENE_TRANSITION_FRAMES}
        durationInFrames={CTA_START - (ROUTE_START - SCENE_TRANSITION_FRAMES)}
      >
        <AbsoluteFill style={getSceneTransitionStyle({ frame, start: ROUTE_START, nextStart: CTA_START })}>
          <RouteMapScene frame={frame - ROUTE_START} />
        </AbsoluteFill>
      </Sequence>

      <Sequence
        from={CTA_START - SCENE_TRANSITION_FRAMES}
        durationInFrames={VIDEO_END - (CTA_START - SCENE_TRANSITION_FRAMES)}
      >
        <AbsoluteFill style={getSceneTransitionStyle({ frame, start: CTA_START, nextStart: null })}>
          <CTAScene frame={frame - CTA_START} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

export const LaunchThumbnail = () => {
  return (
    <AbsoluteFill
      style={{
        fontFamily: FONT_STACK,
        color: BRAND.text,
        background:
          "radial-gradient(100% 100% at 0% 0%, rgba(96,165,250,0.22), transparent 56%), radial-gradient(80% 70% at 100% 100%, rgba(94,234,212,0.16), transparent 48%), linear-gradient(155deg, #050915 0%, #09142a 46%, #0b1226 100%)",
        padding: "68px",
      }}
    >
      <div
        style={{
          alignSelf: "flex-start",
          borderRadius: 999,
          border: "1px solid rgba(94,234,212,0.66)",
          color: "#c0fff7",
          padding: "8px 14px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontSize: 22,
        }}
      >
        Launch Video
      </div>

      <div style={{ marginTop: 22, fontSize: 78, lineHeight: 1.02, fontWeight: 700, maxWidth: 1200 }}>
        See clicks, friction, and drop-off.
      </div>

      <div style={{ marginTop: 16, fontSize: 33, lineHeight: 1.3, color: BRAND.muted, maxWidth: 1120 }}>
        Real-time heatmap overlays and route insights, built for React teams that own their data.
      </div>

      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 900px", gap: 20, alignItems: "start" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignContent: "flex-start" }}>
          {["Heatmap", "Clickmap", "Attention", "Scroll"].map((tag) => (
            <div
              key={tag}
              style={{
                borderRadius: 999,
                border: "1px solid rgba(147, 187, 255, 0.42)",
                padding: "8px 14px",
                color: "#cfe2ff",
                fontFamily: MONO_STACK,
                fontSize: 20,
              }}
            >
              {tag}
            </div>
          ))}
        </div>

        <BrowserFrame title="/pricing" mode="heatmap" frame={42} width={900} height={500} />
      </div>
    </AbsoluteFill>
  );
};
