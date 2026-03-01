'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type DemoMode = 'heatmap' | 'clickmap' | 'scrollmap';

type DevicePreset = 'desktop' | 'tablet' | 'mobile';

interface Dot {
  x: number;
  y: number;
  energy: number;
  life: number;
}

const MODE_LABELS: Record<DemoMode, string> = {
  heatmap: 'Heatmap',
  clickmap: 'Clickmap',
  scrollmap: 'Scrollmap'
};

const DEVICE_LABELS: Record<DevicePreset, string> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile'
};

const METRICS = [
  { label: 'Monthly Cost', value: '$0' },
  { label: 'Tracker Target', value: '<2KB' },
  { label: 'Render Path', value: 'GPU + Worker' },
  { label: 'Privacy', value: 'First-Class' }
];

function createBandBuckets(count: number): number[] {
  return Array.from({ length: count }, () => 0);
}

function drawGradientBackdrop(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  tick: number
): void {
  const gradient = context.createRadialGradient(
    width * (0.35 + Math.sin(tick * 0.0006) * 0.08),
    height * (0.32 + Math.cos(tick * 0.0005) * 0.06),
    0,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.82
  );

  gradient.addColorStop(0, 'rgba(20, 111, 255, 0.15)');
  gradient.addColorStop(0.38, 'rgba(0, 255, 184, 0.08)');
  gradient.addColorStop(0.7, 'rgba(255, 77, 77, 0.08)');
  gradient.addColorStop(1, 'rgba(4, 6, 16, 0.05)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function drawHeatmapDots(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  dots: Dot[]
): void {
  for (const dot of dots) {
    const x = dot.x * width;
    const y = dot.y * height;
    const radius = 14 + dot.energy * 42;

    const radial = context.createRadialGradient(x, y, 0, x, y, radius);
    radial.addColorStop(0, `rgba(255, 72, 72, ${Math.min(0.95, dot.life * 0.95)})`);
    radial.addColorStop(0.32, `rgba(255, 212, 70, ${Math.min(0.75, dot.life * 0.74)})`);
    radial.addColorStop(0.7, `rgba(37, 212, 155, ${Math.min(0.58, dot.life * 0.48)})`);
    radial.addColorStop(1, 'rgba(37, 212, 155, 0)');

    context.fillStyle = radial;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
}

function drawClickmapDots(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  dots: Dot[]
): void {
  for (const dot of dots) {
    const x = dot.x * width;
    const y = dot.y * height;

    context.beginPath();
    context.fillStyle = `rgba(255, 244, 99, ${Math.min(1, dot.life)})`;
    context.arc(x, y, 2 + dot.energy * 4.2, 0, Math.PI * 2);
    context.fill();

    context.beginPath();
    context.strokeStyle = `rgba(255, 94, 94, ${Math.min(0.72, dot.life * 0.64)})`;
    context.lineWidth = 1;
    context.arc(x, y, 8 + dot.energy * 11, 0, Math.PI * 2);
    context.stroke();
  }
}

function drawScrollmapBands(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  dots: Dot[]
): void {
  const buckets = createBandBuckets(8);

  for (const dot of dots) {
    const index = Math.max(0, Math.min(buckets.length - 1, Math.floor(dot.y * buckets.length)));
    buckets[index] += dot.life * 1.4;
  }

  const max = Math.max(...buckets, 0.001);
  const bandHeight = height / buckets.length;

  buckets.forEach((value, index) => {
    const ratio = value / max;
    const hue = 12 + (1 - ratio) * 220;

    context.fillStyle = `hsla(${hue}, 88%, 58%, ${0.16 + ratio * 0.7})`;
    context.fillRect(0, index * bandHeight, width, bandHeight - 1);
  });
}

export default function DocsHome() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dotsRef = useRef<Dot[]>([]);
  const frameRef = useRef<number | undefined>(undefined);
  const lastMoveRef = useRef(0);

  const [mode, setMode] = useState<DemoMode>('heatmap');
  const [device, setDevice] = useState<DevicePreset>('desktop');
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = (): void => setIsReducedMotion(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);

    return () => {
      mediaQuery.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;

    if (!canvas || !stage) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const resize = (): void => {
      const rect = stage.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;

      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);

    const pushDot = (clientX: number, clientY: number): void => {
      const now = performance.now();
      if (now - lastMoveRef.current < 34) {
        return;
      }

      lastMoveRef.current = now;

      const rect = stage.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;

      if (x < 0 || x > 1 || y < 0 || y > 1) {
        return;
      }

      dotsRef.current.unshift({
        x,
        y,
        energy: 0.45 + Math.random() * 0.55,
        life: 1
      });

      dotsRef.current = dotsRef.current.slice(0, 140);
    };

    const onPointerMove = (event: PointerEvent): void => {
      pushDot(event.clientX, event.clientY);
    };

    const onPointerDown = (event: PointerEvent): void => {
      for (let index = 0; index < 3; index += 1) {
        const jitter = 4 + index * 4;
        pushDot(
          event.clientX + (Math.random() - 0.5) * jitter,
          event.clientY + (Math.random() - 0.5) * jitter
        );
      }
    };

    stage.addEventListener('pointermove', onPointerMove, { passive: true });
    stage.addEventListener('pointerdown', onPointerDown, { passive: true });

    const render = (tick: number): void => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;

      context.clearRect(0, 0, width, height);
      drawGradientBackdrop(context, width, height, tick);

      dotsRef.current = dotsRef.current
        .map((dot) => ({ ...dot, life: dot.life - (isReducedMotion ? 0.04 : 0.012) }))
        .filter((dot) => dot.life > 0.02);

      if (mode === 'heatmap') {
        drawHeatmapDots(context, width, height, dotsRef.current);
      } else if (mode === 'clickmap') {
        drawClickmapDots(context, width, height, dotsRef.current);
      } else {
        drawScrollmapBands(context, width, height, dotsRef.current);
      }

      if (!isReducedMotion) {
        frameRef.current = window.requestAnimationFrame(render);
      }
    };

    render(performance.now());

    return () => {
      resizeObserver.disconnect();
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerdown', onPointerDown);

      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [isReducedMotion, mode]);

  const accentText = useMemo(() => {
    if (mode === 'heatmap') {
      return 'Weighted density (gaussian-style)';
    }

    if (mode === 'clickmap') {
      return 'Frequency-scaled click points';
    }

    return 'Depth drop-off bands';
  }, [mode]);

  return (
    <main className="docs-root">
      <section className="hero-shell" ref={stageRef}>
        <canvas ref={canvasRef} className="hero-canvas" aria-hidden="true" />

        <div className="hero-overlay" />

        <header className="nav">
          <div className="brand">react-clickmap</div>
          <div className="actions">
            <button type="button" className="pill ghost">
              Docs
            </button>
            <button type="button" className="pill solid">
              npm install react-clickmap
            </button>
          </div>
        </header>

        <div className="hero-copy">
          <p className="eyebrow">Privacy-first behavior analytics</p>
          <h1>Your heatmaps. Your data. Zero cloud.</h1>
          <p className="subtitle">
            Live demo area: move your cursor to paint interaction density. The overlay intentionally
            mimics capture + render modes from the library.
          </p>

          <div className="control-row">
            {(['heatmap', 'clickmap', 'scrollmap'] as DemoMode[]).map((item) => (
              <button
                key={item}
                type="button"
                className={`chip ${mode === item ? 'active' : ''}`}
                onClick={() => setMode(item)}
              >
                {MODE_LABELS[item]}
              </button>
            ))}
          </div>

          <div className="control-row">
            {(['desktop', 'tablet', 'mobile'] as DevicePreset[]).map((item) => (
              <button
                key={item}
                type="button"
                className={`chip soft ${device === item ? 'active' : ''}`}
                onClick={() => setDevice(item)}
              >
                {DEVICE_LABELS[item]}
              </button>
            ))}
          </div>

          <p className="meta-note">
            Active mode: <strong>{MODE_LABELS[mode]}</strong> | Visual intent: {accentText} |
            Device filter preview: {DEVICE_LABELS[device]}
          </p>
        </div>
      </section>

      <section className="metrics-grid" aria-label="metrics">
        {METRICS.map((metric) => (
          <article key={metric.label} className="metric-card">
            <p>{metric.label}</p>
            <h2>{metric.value}</h2>
          </article>
        ))}
      </section>

      <section className="decision-section">
        <h2>Dynamic design decisions</h2>
        <div className="decision-grid">
          <article>
            <h3>Purposeful motion</h3>
            <p>
              Motion is concentrated in one meaningful zone (hero canvas) instead of scattered micro-
              animations. Reduced-motion users get a calmer static rendering automatically.
            </p>
          </article>
          <article>
            <h3>Visual hierarchy</h3>
            <p>
              Large typographic anchor, compact controls, then metrics. This keeps first-screen
              attention on value proposition before details.
            </p>
          </article>
          <article>
            <h3>Mode storytelling</h3>
            <p>
              The mode chips swap rendering style in-place so docs visitors understand the difference
              between heatmap, clickmap, and scrollmap at a glance.
            </p>
          </article>
          <article>
            <h3>Performance-safe preview</h3>
            <p>
              Canvas rendering is lightweight and bounded to a single stage, making the demo fluid on
              desktop and still usable on mobile widths.
            </p>
          </article>
        </div>
      </section>

      <style>{`
        .docs-root {
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(180deg, #02030a 0%, #02020a 100%);
          color: #f5f7ff;
          font-family: "Sora", "Avenir Next", "Segoe UI", system-ui, sans-serif;
          letter-spacing: 0.01em;
          padding-bottom: 48px;
        }

        .hero-shell {
          position: relative;
          max-width: 1200px;
          min-height: 620px;
          margin: 18px auto 0;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 18px 90px rgba(0, 0, 0, 0.6);
          background: #040614;
        }

        .hero-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .hero-overlay {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 14% 12%, rgba(255, 255, 255, 0.16), transparent 38%),
            linear-gradient(180deg, rgba(5, 7, 18, 0.24), rgba(4, 6, 16, 0.8));
          pointer-events: none;
        }

        .nav {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 20px;
        }

        .brand {
          font-size: 15px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          color: #d4dcff;
          font-weight: 700;
        }

        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .pill {
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 999px;
          padding: 8px 13px;
          font-size: 12px;
          background: transparent;
          color: #edf2ff;
        }

        .pill.solid {
          border-color: rgba(103, 230, 195, 0.6);
          background: linear-gradient(135deg, rgba(35, 208, 146, 0.36), rgba(22, 177, 255, 0.34));
        }

        .hero-copy {
          position: relative;
          z-index: 2;
          padding: 56px 20px 24px;
          max-width: 740px;
        }

        .eyebrow {
          margin: 0;
          color: #74f5d0;
          font-size: 13px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        h1 {
          margin: 12px 0 0;
          font-size: clamp(2.1rem, 5vw, 4.4rem);
          line-height: 1.05;
          max-width: 14ch;
          text-wrap: balance;
        }

        .subtitle {
          margin-top: 14px;
          max-width: 60ch;
          color: #ccdafd;
          font-size: 1.02rem;
          line-height: 1.55;
        }

        .control-row {
          margin-top: 18px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .chip {
          border: 1px solid rgba(255, 255, 255, 0.24);
          border-radius: 10px;
          background: rgba(3, 6, 18, 0.6);
          color: #f0f4ff;
          font-size: 13px;
          padding: 8px 10px;
          transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;
        }

        .chip:hover {
          transform: translateY(-1px);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .chip.active {
          border-color: rgba(68, 229, 171, 0.8);
          background: rgba(11, 74, 69, 0.54);
        }

        .chip.soft.active {
          border-color: rgba(84, 173, 255, 0.84);
          background: rgba(9, 44, 82, 0.5);
        }

        .meta-note {
          margin-top: 14px;
          font-size: 12px;
          color: #97a9da;
        }

        .metrics-grid {
          max-width: 1200px;
          margin: 14px auto 0;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .metric-card {
          background: linear-gradient(160deg, rgba(17, 26, 56, 0.72), rgba(8, 12, 30, 0.86));
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 14px;
        }

        .metric-card p {
          margin: 0;
          color: #9badde;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .metric-card h2 {
          margin: 10px 0 0;
          font-size: clamp(1.3rem, 3vw, 2.2rem);
          line-height: 1.06;
          color: #f8fbff;
        }

        .decision-section {
          max-width: 1200px;
          margin: 26px auto 0;
          background: rgba(8, 12, 30, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          padding: 20px;
        }

        .decision-section h2 {
          margin: 0;
          font-size: clamp(1.3rem, 2.4vw, 2rem);
          color: #f0f5ff;
        }

        .decision-grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .decision-grid article {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 12px;
          background: rgba(3, 6, 20, 0.45);
        }

        .decision-grid h3 {
          margin: 0;
          font-size: 1rem;
        }

        .decision-grid p {
          margin: 8px 0 0;
          color: #bfd0ff;
          font-size: 0.94rem;
          line-height: 1.46;
        }

        @media (max-width: 1024px) {
          .hero-shell,
          .metrics-grid,
          .decision-section {
            margin-left: 12px;
            margin-right: 12px;
          }

          .metrics-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .decision-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .hero-shell {
            min-height: 580px;
          }

          .hero-copy {
            padding-top: 34px;
          }

          .metrics-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
