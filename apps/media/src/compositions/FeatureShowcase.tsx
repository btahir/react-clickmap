import { AbsoluteFill } from "remotion";
import { BRAND, FONT_STACK, MONO_STACK } from "../theme";

const features = [
  {
    title: "Click & Rage Tracking",
    desc: "Every click with frustration detection",
    icon: "click",
  },
  {
    title: "Scroll Depth",
    desc: "See exactly where users drop off",
    icon: "scroll",
  },
  {
    title: "WebGL Rendering",
    desc: "GPU-accelerated heatmap overlays",
    icon: "gpu",
  },
  {
    title: "Self-Hosted Data",
    desc: "Postgres, Supabase, or custom adapter",
    icon: "db",
  },
  {
    title: "Privacy First",
    desc: "DNT + GPC, no cookies, no PII",
    icon: "privacy",
  },
  {
    title: "< 13 KB Bundle",
    desc: "Tree-shakeable ESM, zero deps",
    icon: "bundle",
  },
];

function FeatureIcon({ type }: { type: string }) {
  const size = 32;
  const color = BRAND.primary;
  const dim = "rgba(148, 194, 255, 0.5)";

  switch (type) {
    case "click":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <path d="M12 4v16l5-4 3 10 4-2-3-10h8z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "scroll":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <rect x="8" y="4" width="16" height="24" rx="8" stroke={dim} strokeWidth="2" />
          <line x1="16" y1="10" x2="16" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M12 22l4 4 4-4" stroke={dim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "gpu":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <path d="M6 10l10-6 10 6v12l-10 6-10-6z" stroke={dim} strokeWidth="2" strokeLinejoin="round" />
          <path d="M6 10l10 6 10-6" stroke={dim} strokeWidth="2" />
          <line x1="16" y1="16" x2="16" y2="28" stroke={color} strokeWidth="2" />
        </svg>
      );
    case "db":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <ellipse cx="16" cy="9" rx="10" ry="5" stroke={dim} strokeWidth="2" />
          <path d="M6 9v14c0 3 4 5 10 5s10-2 10-5V9" stroke={dim} strokeWidth="2" />
          <path d="M6 16c0 3 4 5 10 5s10-2 10-5" stroke={color} strokeWidth="2" />
        </svg>
      );
    case "privacy":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <path d="M16 4l10 4v8c0 6-4 10-10 12-6-2-10-6-10-12V8z" stroke={dim} strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 16l3 3 5-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "bundle":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <rect x="6" y="6" width="20" height="20" rx="4" stroke={dim} strokeWidth="2" />
          <path d="M6 14h20" stroke={dim} strokeWidth="2" />
          <path d="M12 14v12" stroke={dim} strokeWidth="2" />
          <circle cx="9" cy="10" r="1.5" fill={color} />
          <circle cx="14" cy="10" r="1.5" fill={color} />
        </svg>
      );
    default:
      return null;
  }
}

export const FeatureShowcase = () => {
  return (
    <AbsoluteFill
      style={{
        fontFamily: FONT_STACK,
        color: BRAND.text,
        background:
          "radial-gradient(80% 70% at 0% 0%, rgba(96,165,250,0.18), transparent 55%), radial-gradient(70% 60% at 100% 100%, rgba(94,234,212,0.14), transparent 50%), linear-gradient(155deg, #050915 0%, #09142a 48%, #0b1226 100%)",
        padding: "56px 64px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
        <div
          style={{
            borderRadius: 999,
            border: "1px solid rgba(94, 234, 212, 0.55)",
            color: "#b8fff5",
            padding: "5px 12px",
            fontSize: 14,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          react-clickmap
        </div>
        <div
          style={{
            borderRadius: 999,
            border: "1px solid rgba(148, 194, 255, 0.25)",
            padding: "5px 12px",
            color: "#a0b8e0",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Open Source
        </div>
      </div>

      <div
        style={{
          fontSize: 48,
          fontWeight: 800,
          lineHeight: 1.08,
          letterSpacing: "-0.02em",
          maxWidth: 900,
          marginBottom: 8,
        }}
      >
        Your heatmaps. Your data.
        <br />
        <span style={{ color: BRAND.primary }}>Zero cloud.</span>
      </div>

      <div
        style={{
          fontSize: 20,
          color: BRAND.muted,
          marginBottom: 32,
          maxWidth: 700,
          lineHeight: 1.4,
        }}
      >
        Privacy-first click, scroll, and attention tracking for React with GPU-accelerated rendering.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {features.map((feature) => (
          <div
            key={feature.title}
            style={{
              borderRadius: 16,
              border: "1px solid rgba(148, 194, 255, 0.18)",
              background: "rgba(10, 18, 38, 0.7)",
              padding: "20px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <FeatureIcon type={feature.icon} />
            <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>{feature.title}</div>
            <div style={{ fontSize: 14, color: BRAND.muted, lineHeight: 1.4 }}>{feature.desc}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 24,
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          borderRadius: 12,
          border: "1px solid rgba(94,234,212,0.45)",
          background: "rgba(94,234,212,0.08)",
          padding: "10px 18px",
          fontSize: 18,
          fontFamily: MONO_STACK,
          fontWeight: 600,
        }}
      >
        <span style={{ color: BRAND.primary }}>$</span> npm install react-clickmap
      </div>
    </AbsoluteFill>
  );
};
