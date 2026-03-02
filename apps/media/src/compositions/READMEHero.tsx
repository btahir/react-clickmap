import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND, FONT_STACK, MONO_STACK } from "../theme";

type Dot = {
  x: number;
  y: number;
  strength: number;
  phase: number;
};

const DOTS: Dot[] = [
  { x: 0.68, y: 0.31, strength: 1.0, phase: 0 },
  { x: 0.74, y: 0.48, strength: 0.88, phase: 12 },
  { x: 0.56, y: 0.44, strength: 0.84, phase: 21 },
  { x: 0.62, y: 0.6, strength: 0.92, phase: 33 },
  { x: 0.8, y: 0.56, strength: 0.7, phase: 42 },
  { x: 0.5, y: 0.31, strength: 0.64, phase: 51 },
  { x: 0.86, y: 0.38, strength: 0.58, phase: 60 },
  { x: 0.58, y: 0.71, strength: 0.52, phase: 75 },
  { x: 0.89, y: 0.68, strength: 0.55, phase: 81 },
  { x: 0.47, y: 0.56, strength: 0.45, phase: 95 },
];

const GRID_LINES = Array.from({ length: 18 }, (_, index) => index + 1);

const metricCards = [
  { label: "Events", value: "2.3M", color: BRAND.text },
  { label: "Rage Rate", value: "3.2%", color: "#ff9090" },
  { label: "Dead Click", value: "1.4%", color: BRAND.warning },
  { label: "Storage", value: "Your DB", color: BRAND.primary },
];

const clickRipples = [
  { x: 0.66, y: 0.35, delay: 10 },
  { x: 0.75, y: 0.50, delay: 42 },
  { x: 0.58, y: 0.62, delay: 78 },
  { x: 0.82, y: 0.40, delay: 115 },
  { x: 0.52, y: 0.45, delay: 145 },
];

export const READMEHero = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const pulse = (phase: number): number => {
    const cycle = Math.sin((frame + phase) * 0.08);
    return 0.52 + (cycle + 1) * 0.24;
  };

  const shimmer = interpolate(frame % Math.round(fps * 3), [0, fps * 3], [0.12, 0.34]);

  const eventCount = Math.floor(
    interpolate(frame, [0, 120], [2287403, 2287892], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const formattedCount = `${(eventCount / 1_000_000).toFixed(1)}M`;

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(100% 90% at 0% 0%, rgba(96, 165, 250, 0.20), transparent 55%), radial-gradient(100% 90% at 100% 100%, rgba(94, 234, 212, 0.16), transparent 52%), linear-gradient(155deg, #050915 0%, #09142a 48%, #0b1226 100%)",
        color: BRAND.text,
        fontFamily: FONT_STACK,
      }}
    >
      <AbsoluteFill style={{ opacity: 0.16 }}>
        {GRID_LINES.map((line) => (
          <div
            key={`v-${line}`}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${(line / 18) * 100}%`,
              width: 1,
              background: "linear-gradient(180deg, rgba(96,165,250,0), rgba(96,165,250,0.35), rgba(96,165,250,0))",
            }}
          />
        ))}
      </AbsoluteFill>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.05fr 1fr",
          gap: 28,
          height: "100%",
          padding: "56px 64px",
        }}
      >
        <div
          style={{
            transform: `translateY(${Math.sin(frame * 0.02) * 2}px)`,
            opacity: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              alignSelf: "flex-start",
              borderRadius: 999,
              border: "1px solid rgba(94, 234, 212, 0.55)",
              color: "#b8fff5",
              padding: "6px 12px",
              fontSize: 20,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            react-clickmap
          </div>

          <div
            style={{
              fontSize: 72,
              lineHeight: 1.02,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              maxWidth: 620,
              textWrap: "balance",
            }}
          >
            Privacy-first heatmaps for React.
          </div>

          <div
            style={{
              fontSize: 30,
              color: BRAND.muted,
              maxWidth: 620,
              lineHeight: 1.32,
            }}
          >
            Capture clicks, scroll, and movement. Render GPU overlays. Keep data in your own stack.
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
            <div
              style={{
                borderRadius: 12,
                background: `linear-gradient(135deg, rgba(94,234,212,${shimmer}), rgba(96,165,250,0.16))`,
                border: "1px solid rgba(94, 234, 212, 0.5)",
                padding: "12px 16px",
                fontSize: 19,
                fontWeight: 700,
                fontFamily: MONO_STACK,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ color: BRAND.primary }}>$</span> npm install react-clickmap
            </div>
            <div
              style={{
                borderRadius: 12,
                border: "1px solid rgba(96, 165, 250, 0.4)",
                padding: "12px 16px",
                fontSize: 19,
                fontWeight: 600,
                color: "#c9ddff",
              }}
            >
              Zero cloud
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            {["MIT Licensed", "< 13 KB", "WebGL Rendered"].map((tag) => (
              <div
                key={tag}
                style={{
                  borderRadius: 999,
                  border: "1px solid rgba(148, 194, 255, 0.22)",
                  padding: "4px 10px",
                  color: "#a0b8e0",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            transform: `translateY(${Math.cos(frame * 0.018) * 2}px)`,
            opacity: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "relative",
              width: width * 0.46,
              height: height * 0.73,
              borderRadius: 22,
              border: "1px solid rgba(255,255,255,0.16)",
              background:
                "linear-gradient(160deg, rgba(11,18,38,0.95), rgba(8,13,30,0.92) 50%, rgba(15,23,48,0.95) 100%)",
              boxShadow: "0 32px 64px rgba(0,0,0,0.35)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: 56,
                borderBottom: "1px solid rgba(255,255,255,0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 16px",
                fontSize: 14,
                color: "#c7dcff",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(255,95,95,0.65)" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(255,209,102,0.65)" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(94,234,212,0.65)" }} />
                </div>
                <span style={{ marginLeft: 4 }}>Live Overlay</span>
              </div>
              <span style={{ fontFamily: MONO_STACK, color: "#9ec2ff" }}>mode: heatmap</span>
            </div>

            <div style={{ position: "relative", height: "calc(100% - 56px)", padding: 16 }}>
              <div
                style={{
                  position: "absolute",
                  left: 18,
                  right: 18,
                  top: 18,
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {metricCards.map((card, index) => (
                  <div
                    key={card.label}
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(148, 183, 255, 0.24)",
                      background: "rgba(10, 18, 38, 0.76)",
                      padding: "10px 10px 12px",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#8fa7d9", marginBottom: 6 }}>{card.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: card.color }}>
                      {index === 0 ? formattedCount : card.value}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  position: "absolute",
                  left: 18,
                  right: 18,
                  bottom: 16,
                  top: 118,
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background:
                    "linear-gradient(180deg, rgba(11,18,38,0.86), rgba(8,13,30,0.82)), radial-gradient(circle at 25% 20%, rgba(96,165,250,0.22), transparent 42%), radial-gradient(circle at 75% 80%, rgba(94,234,212,0.18), transparent 46%)",
                  overflow: "hidden",
                }}
              >
                {DOTS.map((dot) => {
                  const glow = pulse(dot.phase) * dot.strength;
                  return (
                    <div
                      key={`${dot.x}-${dot.y}-${dot.phase}`}
                      style={{
                        position: "absolute",
                        width: 120 * dot.strength,
                        height: 120 * dot.strength,
                        left: dot.x * 100 + "%",
                        top: dot.y * 100 + "%",
                        transform: "translate(-50%, -50%)",
                        borderRadius: "50%",
                        background: `radial-gradient(circle, rgba(255,95,95,${0.2 * glow}) 0%, rgba(255,209,102,${0.3 * glow}) 34%, rgba(94,234,212,${0.22 * glow}) 58%, rgba(94,234,212,0) 100%)`,
                        filter: `blur(${8 - dot.strength * 2}px)`,
                      }}
                    />
                  );
                })}

                {clickRipples.map((ripple) => {
                  const rippleFrame = (frame - ripple.delay + 180) % 180;
                  const rippleProgress = interpolate(rippleFrame, [0, 30], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.out(Easing.cubic),
                  });
                  const rippleOpacity = interpolate(rippleFrame, [0, 8, 30], [0, 0.7, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  });

                  return (
                    <div
                      key={`ripple-${ripple.x}-${ripple.y}`}
                      style={{
                        position: "absolute",
                        left: `${ripple.x * 100}%`,
                        top: `${ripple.y * 100}%`,
                        transform: "translate(-50%, -50%)",
                        width: 6 + rippleProgress * 30,
                        height: 6 + rippleProgress * 30,
                        borderRadius: "50%",
                        border: `1.5px solid rgba(255, 209, 102, ${rippleOpacity})`,
                        background: rippleProgress < 0.15
                          ? `rgba(255, 209, 102, ${rippleOpacity * 0.6})`
                          : "transparent",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const READMEHeroPoster = READMEHero;
