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

const cardData = [
  { title: "Core Package", value: "react-clickmap", detail: "Capture + render" },
  { title: "Next Helpers", value: "@react-clickmap/next", detail: "Route + API glue" },
  { title: "Dashboard", value: "@react-clickmap/dashboard", detail: "Batteries-included UI" },
  { title: "Local CLI", value: "react-clickmap-cli", detail: "Self-hosted preview" },
];

const overlays = ["Heatmap", "Comparison", "Attention", "Scroll Depth"];

const timelineSteps = [
  "Capture events",
  "Batch and transport",
  "Persist in your DB",
  "Render overlays",
  "Ship insights",
];

function SceneTitle({
  title,
  subtitle,
  frame,
  delay = 0,
}: {
  title: string;
  subtitle: string;
  frame: number;
  delay?: number;
}) {
  const { fps } = useVideoConfig();

  const inSpring = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
    durationInFrames: Math.round(fps * 1.1),
  });

  const titleY = interpolate(1 - inSpring, [0, 1], [0, 28]);

  return (
    <div
      style={{
        opacity: inSpring,
        transform: `translateY(${titleY}px)`,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{
          fontSize: 66,
          lineHeight: 1.05,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          textWrap: "balance",
          maxWidth: 920,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 28, lineHeight: 1.35, color: BRAND.muted, maxWidth: 960 }}>{subtitle}</div>
    </div>
  );
}

function Background({ frame }: { frame: number }) {
  const driftX = Math.sin(frame * 0.012) * 5;
  const driftY = Math.cos(frame * 0.01) * 5;

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(110% 100% at 0% 0%, rgba(96,165,250,0.22), transparent 52%), radial-gradient(95% 90% at 100% 100%, rgba(94,234,212,0.16), transparent 50%), linear-gradient(155deg, #050915 0%, #081329 48%, #0b1226 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -40,
          transform: `translate(${driftX}px, ${driftY}px)`,
          background:
            "repeating-linear-gradient(90deg, rgba(96,165,250,0.07) 0px, rgba(96,165,250,0.07) 1px, transparent 1px, transparent 72px)",
          maskImage: "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
        }}
      />
    </AbsoluteFill>
  );
}

function IntroScene({ frame }: { frame: number }) {
  const { fps } = useVideoConfig();
  const scaleIn = spring({
    frame,
    fps,
    config: { damping: 180 },
    durationInFrames: Math.round(fps * 1.4),
  });

  return (
    <AbsoluteFill style={{ padding: "84px 92px", fontFamily: FONT_STACK, color: BRAND.text }}>
      <SceneTitle
        frame={frame}
        title="React-Clickmap"
        subtitle="Privacy-first heatmaps for React. Your data, your database, zero cloud."
      />

      <div
        style={{
          marginTop: 34,
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          transform: `scale(${0.94 + scaleIn * 0.06})`,
          transformOrigin: "left center",
        }}
      >
        {[
          "Click + Scroll + Movement",
          "WebGL Rendering",
          "Self-Hosted Adapters",
          "Realtime Overlays",
        ].map((chip, index) => (
          <div
            key={chip}
            style={{
              borderRadius: 999,
              border: "1px solid rgba(148, 208, 255, 0.45)",
              background:
                index % 2 === 0
                  ? "rgba(96,165,250,0.15)"
                  : "linear-gradient(135deg, rgba(94,234,212,0.16), rgba(96,165,250,0.12))",
              color: "#dbecff",
              fontSize: 22,
              letterSpacing: "0.02em",
              padding: "10px 20px",
              fontWeight: 600,
            }}
          >
            {chip}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

function ProblemScene({ frame }: { frame: number }) {
  const issues = [
    "Cloud tools own your behavior data",
    "Session pricing grows with your traffic",
    "Script-only trackers are hard to control in React",
  ];

  return (
    <AbsoluteFill style={{ padding: "84px 92px", fontFamily: FONT_STACK, color: BRAND.text }}>
      <SceneTitle
        frame={frame}
        title="Why teams switch"
        subtitle="Shipping behavior analytics without vendor lock-in or recurring event tax."
      />

      <div style={{ display: "grid", gap: 18, marginTop: 34 }}>
        {issues.map((issue, index) => {
          const reveal = interpolate(frame, [18 + index * 10, 36 + index * 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });

          return (
            <div
              key={issue}
              style={{
                opacity: reveal,
                transform: `translateX(${interpolate(1 - reveal, [0, 1], [0, 28])}px)`,
                border: "1px solid rgba(255,255,255,0.14)",
                borderLeft: "6px solid rgba(94,234,212,0.65)",
                borderRadius: 14,
                background: "rgba(8, 15, 32, 0.72)",
                padding: "18px 20px",
                fontSize: 29,
                lineHeight: 1.32,
                color: "#e7f2ff",
              }}
            >
              {issue}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function ProductScene({ frame }: { frame: number }) {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ padding: "72px 82px", fontFamily: FONT_STACK, color: BRAND.text }}>
      <SceneTitle
        frame={frame}
        title="Modern package surface"
        subtitle="Composable building blocks for capture, storage, visualization, and integration."
      />

      <div
        style={{
          marginTop: 28,
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        {cardData.map((card, index) => {
          const rise = spring({
            frame: frame - index * 8,
            fps,
            config: { damping: 200 },
            durationInFrames: 32,
          });

          return (
            <div
              key={card.value}
              style={{
                opacity: rise,
                transform: `translateY(${interpolate(1 - rise, [0, 1], [0, 20])}px)`,
                borderRadius: 18,
                border: "1px solid rgba(148, 204, 255, 0.26)",
                background:
                  "linear-gradient(160deg, rgba(11,18,38,0.94), rgba(9,16,34,0.92)), radial-gradient(circle at 20% 0%, rgba(96,165,250,0.18), transparent 50%)",
                padding: "18px 18px 20px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              }}
            >
              <div style={{ fontSize: 16, color: BRAND.muted, marginBottom: 8 }}>{card.title}</div>
              <div
                style={{
                  fontSize: 33,
                  lineHeight: 1.1,
                  fontFamily: MONO_STACK,
                  color: "#d4e8ff",
                  marginBottom: 10,
                }}
              >
                {card.value}
              </div>
              <div style={{ fontSize: 24, color: "#cfe1ff" }}>{card.detail}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function OverlayScene({ frame }: { frame: number }) {
  return (
    <AbsoluteFill style={{ padding: "84px 92px", fontFamily: FONT_STACK, color: BRAND.text }}>
      <SceneTitle
        frame={frame}
        title="Analyst-grade overlays"
        subtitle="Switch visualization modes instantly: from click density to attention and route comparisons."
      />

      <div
        style={{
          marginTop: 30,
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.16)",
          background:
            "linear-gradient(180deg, rgba(10,16,34,0.92), rgba(8,13,30,0.9)), radial-gradient(circle at 70% 70%, rgba(94,234,212,0.18), transparent 46%)",
          height: 420,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 62% 38%, rgba(255,96,96,0.22), transparent 28%), radial-gradient(circle at 42% 62%, rgba(255,209,102,0.19), transparent 26%), radial-gradient(circle at 78% 62%, rgba(94,234,212,0.18), transparent 30%), radial-gradient(circle at 30% 28%, rgba(96,165,250,0.18), transparent 24%)",
            filter: `blur(${3 + Math.sin(frame * 0.05) * 1.5}px)`,
          }}
        />

        <div style={{ position: "absolute", left: 18, right: 18, bottom: 18, display: "flex", gap: 10 }}>
          {overlays.map((overlay, index) => {
            const activeIndex = Math.floor((frame / 22) % overlays.length);
            const active = activeIndex === index;
            return (
              <div
                key={overlay}
                style={{
                  borderRadius: 999,
                  border: active
                    ? "1px solid rgba(94,234,212,0.8)"
                    : "1px solid rgba(148, 190, 255, 0.3)",
                  background: active
                    ? "rgba(94,234,212,0.18)"
                    : "rgba(10, 19, 40, 0.76)",
                  padding: "8px 14px",
                  color: active ? "#c5fff6" : "#ccdefd",
                  fontSize: 21,
                  fontWeight: 600,
                }}
              >
                {overlay}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function ArchitectureScene({ frame }: { frame: number }) {
  return (
    <AbsoluteFill style={{ padding: "84px 92px", fontFamily: FONT_STACK, color: BRAND.text }}>
      <SceneTitle
        frame={frame}
        title="Data flow you control"
        subtitle="Capture in-browser, route through your backend, persist in Postgres, Supabase, or custom adapters."
      />

      <div style={{ marginTop: 36, display: "flex", gap: 14, alignItems: "center" }}>
        {timelineSteps.map((step, index) => {
          const reveal = interpolate(frame, [8 + index * 8, 24 + index * 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={step}
              style={{ display: "flex", alignItems: "center", gap: 14 }}
            >
              <div
                style={{
                  opacity: reveal,
                  transform: `translateY(${interpolate(1 - reveal, [0, 1], [0, 18])}px)`,
                  borderRadius: 14,
                  border: "1px solid rgba(148, 204, 255, 0.35)",
                  background: "rgba(9, 17, 34, 0.8)",
                  padding: "16px 18px",
                  minWidth: 190,
                  textAlign: "center",
                  fontSize: 20,
                  fontWeight: 600,
                  lineHeight: 1.25,
                  color: "#e4f1ff",
                }}
              >
                {step}
              </div>
              {index < timelineSteps.length - 1 ? (
                <div
                  style={{
                    width: 26,
                    height: 2,
                    background: "linear-gradient(90deg, rgba(96,165,250,0.7), rgba(94,234,212,0.6))",
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function ClosingScene({ frame }: { frame: number }) {
  const { fps } = useVideoConfig();
  const callToAction = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: Math.round(fps * 1.2),
  });

  return (
    <AbsoluteFill style={{ padding: "84px 92px", fontFamily: FONT_STACK, color: BRAND.text }}>
      <SceneTitle
        frame={frame}
        title="Ship your own click intelligence"
        subtitle="Open source, dependency-light, and built for self-hosted teams that care about privacy and control."
      />

      <div
        style={{
          marginTop: 40,
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          borderRadius: 14,
          border: "1px solid rgba(94,234,212,0.68)",
          background: "linear-gradient(135deg, rgba(94,234,212,0.17), rgba(96,165,250,0.16))",
          padding: "14px 22px",
          fontSize: 31,
          fontWeight: 700,
          transform: `translateY(${interpolate(1 - callToAction, [0, 1], [0, 18])}px) scale(${0.98 + callToAction * 0.02})`,
          opacity: callToAction,
        }}
      >
        npm install react-clickmap
      </div>
    </AbsoluteFill>
  );
}

export const LaunchVideo = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ fontFamily: FONT_STACK, color: BRAND.text }}>
      <Background frame={frame} />

      <Sequence from={0} durationInFrames={120}>
        <IntroScene frame={frame} />
      </Sequence>

      <Sequence from={120} durationInFrames={150}>
        <ProblemScene frame={frame - 120} />
      </Sequence>

      <Sequence from={270} durationInFrames={180}>
        <ProductScene frame={frame - 270} />
      </Sequence>

      <Sequence from={450} durationInFrames={150}>
        <OverlayScene frame={frame - 450} />
      </Sequence>

      <Sequence from={600} durationInFrames={180}>
        <ArchitectureScene frame={frame - 600} />
      </Sequence>

      <Sequence from={780} durationInFrames={120}>
        <ClosingScene frame={frame - 780} />
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
        padding: "72px",
      }}
    >
      <div
        style={{
          alignSelf: "flex-start",
          borderRadius: 999,
          border: "1px solid rgba(94,234,212,0.62)",
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

      <div style={{ marginTop: 24, fontSize: 82, lineHeight: 1.02, fontWeight: 700, maxWidth: 1200 }}>
        React-Clickmap
        <br />
        Product Walkthrough
      </div>

      <div style={{ marginTop: 20, fontSize: 34, lineHeight: 1.32, color: BRAND.muted, maxWidth: 1160 }}>
        Privacy-first heatmaps for React with first-party Next.js, dashboard, and local CLI workflows.
      </div>

      <div style={{ marginTop: 28, display: "flex", gap: 10, flexWrap: "wrap" }}>
        {["Core", "Next", "Dashboard", "CLI"].map((tag) => (
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
    </AbsoluteFill>
  );
};
