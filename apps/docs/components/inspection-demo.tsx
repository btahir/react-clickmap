"use client";
import { ClickmapStudio } from "@react-clickmap/dashboard";
import { useMemo, useState } from "react";
import { type CaptureEvent, ClickmapProvider, memoryAdapter } from "react-clickmap";

function sample(): CaptureEvent[] {
  const events: CaptureEvent[] = [];
  const now = Date.now();
  for (let session = 0; session < 24; session++) {
    const base = {
      schemaVersion: 1 as const,
      eventVersion: 1 as const,
      projectId: "demo",
      sessionId: `demo-${session}`,
      layoutId: "pricing-v1",
      timestamp: now - session * 900000,
      pathname: "/",
      routeKey: "/",
      deviceType: "desktop" as const,
      viewport: { width: 1440, height: 900, scrollX: 0, scrollY: 0 },
    };
    events.push({
      ...base,
      eventId: `scroll-${session}`,
      type: "scroll",
      depth: session < 18 ? 70 : 30,
      maxDepth: session < 18 ? 70 : 30,
    });
    events.push({
      ...base,
      eventId: `click-${session}`,
      type: "click",
      x: 35,
      y: 50,
      docX: 35,
      docY: 22,
      docWidth: 1440,
      docHeight: 3000,
      selector: '[data-clickmap-id="start-project"]',
      pointerType: "mouse",
    });
    if (session < 8)
      events.push({
        ...base,
        eventId: `dead-${session}`,
        type: "dead-click",
        x: 70,
        y: 50,
        docX: 70,
        docY: 22,
        docWidth: 1440,
        docHeight: 3000,
        selector: '[data-clickmap-id="compare-plans"]',
        pointerType: "mouse",
        reason: "non-interactive-target",
      });
  }
  return events;
}
export function InspectionDemo() {
  const [mode, setMode] = useState<"synthetic" | "captured">("synthetic");
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const adapter = useMemo(() => memoryAdapter(mode === "synthetic" ? sample() : []), [mode]);
  return (
    <ClickmapProvider
      adapter={adapter}
      projectId="demo"
      layoutId="pricing-v1"
      enabled={enabled}
      capture={["click", "scroll", "dead-click", "rage-click"]}
      flushIntervalMs={400}
    >
      <div className="demo-wrap">
        <div className="demo-caption" data-clickmap-ignore="">
          <div>
            <span className="kicker">WORKING DEMO / NO ACCOUNT NEEDED</span>
            <h2>From a click to a clearer decision.</h2>
          </div>
          <div className="demo-toggle">
            <button
              type="button"
              aria-pressed={mode === "synthetic"}
              onClick={() => {
                setMode("synthetic");
                setEnabled(false);
              }}
            >
              Explore sample
            </button>
            <button
              type="button"
              aria-pressed={mode === "captured"}
              onClick={() => {
                setMode("captured");
                setEnabled(true);
              }}
            >
              Capture my session
            </button>
            {mode === "captured" ? (
              <button type="button" onClick={() => setEnabled(!enabled)}>
                {enabled ? "Pause capture" : "Resume capture"}
              </button>
            ) : null}
          </div>
        </div>
        <p className="demo-disclosure">
          {mode === "synthetic"
            ? "24 synthetic sessions. Illustrative signals, not real visitors."
            : "Your clicks and scrolls stay in this tab’s memory. Refresh to erase. DNT and GPC are respected."}
        </p>
        <section className="fixture" aria-label="Sample application">
          <div>
            <span className="fixture-brand">FIELDNOTES</span>
            <h3>
              A little space for
              <br />
              your next big idea.
            </h3>
            <p>
              Save the research. Gather your team.
              <br />
              Make something worth sharing.
            </p>
            <button
              type="button"
              data-clickmap-id="start-project"
              onClick={() => setMessage("Project created — this button works.")}
            >
              Start a project <span aria-hidden>↗</span>
            </button>
            <output>{message}</output>
          </div>
          <div className="fixture-plans">
            <small>THE STUDIO PLAN</small>
            <strong>
              $12<span> / month</span>
            </strong>
            <ul>
              <li>Unlimited notes and collections</li>
              <li>A shared space for your team</li>
              <li>Simple, beautiful exports</li>
            </ul>
            <p data-clickmap-id="compare-plans" className="fake-link">
              Compare plans ↗
            </p>
            <small>
              This sample text looks clickable but has no action. Click it to create a dead-click
              signal.
            </small>
          </div>
        </section>
        <ClickmapStudio
          key={mode}
          adapter={adapter}
          projectId="demo"
          layoutId="pricing-v1"
          source={mode}
          completeness="complete"
        />
      </div>
    </ClickmapProvider>
  );
}
