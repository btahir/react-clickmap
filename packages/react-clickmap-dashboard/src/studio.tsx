"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type ClickmapAdapter,
  Heatmap,
  type HeatmapHandle,
  type HeatmapQuery,
  memoryAdapter,
  useHeatmapData,
} from "react-clickmap";
import {
  buildReport,
  createEvidence,
  type EvidenceBundle,
  evidenceCsv,
  evidenceMarkdown,
  validateEvidence,
} from "react-clickmap/contracts";
export interface ClickmapStudioProps {
  adapter: ClickmapAdapter;
  projectId: string;
  source?: "synthetic" | "captured";
  layoutId?: string;
  title?: string;
  completeness?: EvidenceBundle["completeness"];
}
const styles = `
.cm-studio{--ink:#152c2b;--muted:#586967;--paper:#fffef8;--line:#d7ded5;font:14px/1.55 ui-sans-serif,system-ui,sans-serif;color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:28px;max-width:1200px;margin:auto;box-sizing:border-box}.cm-studio *{box-sizing:border-box}.cm-studio button,.cm-studio input,.cm-studio select{font:inherit;color:inherit}.cm-studio button,.cm-studio select,.cm-studio input{border:1px solid #aebdb4;background:white;border-radius:6px;padding:8px 11px}.cm-studio button{cursor:pointer}.cm-studio button:hover{background:#e7eee6}.cm-studio button:disabled{opacity:.45;cursor:not-allowed}.cm-studio :focus-visible{outline:3px solid #c66a32;outline-offset:3px}.cm-studio h2{font-size:29px;line-height:1.2;letter-spacing:-1px;margin:4px 0 8px}.cm-studio h3{font-size:16px;margin:0 0 14px}.cm-studio p{margin:6px 0}.cm-studio small,.cm-muted{color:var(--muted)}.cm-top,.cm-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.cm-top{justify-content:space-between}.cm-eyebrow{text-transform:uppercase;font-size:11px;font-weight:750;letter-spacing:1.7px}.cm-status{background:#e7eee6;color:#214a36;padding:5px 10px;border-radius:20px;font-size:12px}.cm-filters{display:grid;grid-template-columns:2fr repeat(4,1fr);gap:12px;border-block:1px solid var(--line);padding:20px 0;margin:22px 0}.cm-filters input,.cm-filters select{width:100%;min-width:0}.cm-filters label{min-width:0;display:grid;gap:5px;font-size:12px;font-weight:650}.cm-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin:24px 0}.cm-stat strong{display:block;font-size:31px;font-weight:600;letter-spacing:-1px}.cm-stat span{font-size:12px;color:var(--muted)}.cm-grid{display:grid;grid-template-columns:1.3fr 1fr;gap:28px;margin-block:28px}.cm-scrollrow{display:grid;grid-template-columns:42px 1fr 38px;gap:9px;align-items:center;font-size:11px;margin:8px 0}.cm-bar{background:#e6eae2;border-radius:3px;height:9px;overflow:hidden}.cm-bar i{display:block;background:#44735d;height:100%}.cm-studio table{width:100%;border-collapse:collapse;text-align:left;font-size:12px}.cm-studio th,.cm-studio td{padding:9px 5px;border-bottom:1px solid var(--line)}.cm-studio td:first-child{max-width:200px;overflow-wrap:anywhere}.cm-note{background:#f1f1e7;border-left:3px solid #a9b8a6;padding:12px 15px;margin:14px 0;font-size:12px}.cm-studio summary{cursor:pointer;font-weight:650}.cm-studio pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;max-height:220px;overflow:auto}.cm-bottom{border-top:1px solid var(--line);padding-top:20px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}.cm-overlay-close{position:fixed;right:20px;top:20px;z-index:20001!important;background:#fff!important;box-shadow:0 2px 20px #0003}.cm-empty{padding:35px 10px;text-align:center}.cm-studio [role=alert]{color:#a73425}@media(max-width:760px){.cm-studio{padding:18px}.cm-filters{grid-template-columns:minmax(0,1fr)}.cm-grid{grid-template-columns:1fr}.cm-stats{grid-template-columns:1fr 1fr}.cm-studio h2{font-size:24px}}
`;
function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ClickmapStudio({
  adapter,
  projectId,
  source = "captured",
  layoutId,
  title = "Inspection desk",
  completeness = "bounded",
}: ClickmapStudioProps) {
  const [viewport, setViewport] = useState("");
  const [page, setPage] = useState("");
  const [device, setDevice] = useState("all");
  const [layout, setLayout] = useState(layoutId ?? "");
  const [windowDays, setWindowDays] = useState("all");
  const [overlay, setOverlay] = useState(false);
  const [notice, setNotice] = useState("");
  const [imported, setImported] = useState<EvidenceBundle | null>(null);
  const [selection, setSelection] = useState("");
  const heatmap = useRef<HeatmapHandle>(null);
  const file = useRef<HTMLInputElement>(null);
  const query = useMemo<HeatmapQuery>(
    () => ({
      projectId,
      ...(page ? { page } : {}),
      device: device as NonNullable<HeatmapQuery["device"]>,
      ...(layout ? { layoutId: layout } : {}),
      ...(viewport
        ? { viewportMin: Math.max(0, Number(viewport) - 20), viewportMax: Number(viewport) + 20 }
        : {}),
      ...(windowDays !== "all" ? { from: Date.now() - Number(windowDays) * 86400000 } : {}),
      limit: 10000,
    }),
    [projectId, page, device, layout, windowDays, viewport],
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: changing the cohort invalidates the displayed overlay and selection.
  useEffect(() => {
    setOverlay(false);
    setSelection("");
    setNotice("");
  }, [query]);
  const effective = useMemo(
    () => (imported ? memoryAdapter(imported.events) : adapter),
    [adapter, imported],
  );
  const { data, error, isLoading, reload } = useHeatmapData(effective, imported ? {} : query, true);
  useEffect(() => {
    if (imported) return;
    const timer = setInterval(() => void reload(), 3000);
    return () => clearInterval(timer);
  }, [reload, imported]);
  const bundle = useMemo(
    () =>
      createEvidence(
        data,
        imported?.query ?? query,
        imported?.source ?? source,
        imported?.completeness ?? completeness,
      ),
    [data, query, source, imported, completeness],
  );
  const report = useMemo(() => buildReport(bundle), [bundle]);
  const cohort = useMemo(() => memoryAdapter(data), [data]);
  useEffect(() => {
    if (!overlay) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOverlay(false);
    };
    const pathname = window.location.pathname;
    const width = window.innerWidth;
    const timer = window.setInterval(() => {
      if (window.location.pathname !== pathname || Math.abs(window.innerWidth - width) > 40) {
        setOverlay(false);
        setSelection("");
        setNotice(
          "Page or viewport changed. Select a compatible cohort before reopening the overlay.",
        );
      }
    }, 500);
    window.addEventListener("keydown", key);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("keydown", key);
    };
  }, [overlay]);
  const compatible = () => {
    const paths = new Set(data.map((e) => e.pathname));
    const layouts = new Set(data.map((e) => e.layoutId ?? "unknown"));
    if (paths.size !== 1 || !paths.has(window.location.pathname)) {
      setNotice("Select a single captured page matching the current app before inspecting it.");
      return false;
    }
    if (!layoutId || layouts.size !== 1 || !layouts.has(layoutId)) {
      setNotice(
        "Configure Studio with the current layoutId and choose that captured revision before inspecting targets.",
      );
      return false;
    }
    return true;
  };
  const inspect = (target: string) => {
    if (!compatible()) return;
    try {
      const el = document.querySelector(target);
      if (!el) {
        setNotice("Target is absent in this page/layout. Navigate to the captured page first.");
        return;
      }
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "center" });
      if (!reduced)
        el.animate(
          [
            { outline: "4px solid #c66a32", outlineOffset: "6px" },
            { outline: "4px solid transparent", outlineOffset: "12px" },
          ],
          { duration: 2000 },
        );
      setSelection(target);
      setNotice(`Located ${target}`);
    } catch {
      setNotice("This target cannot be resolved in the current document.");
    }
  };
  return (
    <section className="cm-studio" data-clickmap-studio="" aria-label="Clickmap Studio">
      <style>{styles}</style>
      <div className="cm-top">
        <div>
          <span className="cm-eyebrow">Clickmap Studio / Local evidence</span>
          <h2>{title}</h2>
          <p className="cm-muted">See the interaction. Understand the limits. Keep your data.</p>
        </div>
        <span className="cm-status">
          {imported
            ? "Imported evidence"
            : source === "synthetic"
              ? "Synthetic sample"
              : data.length
                ? "Events received"
                : page || device !== "all" || windowDays !== "all" || viewport
                  ? "No matching events"
                  : "Waiting for first event"}
        </span>
      </div>
      <div className="cm-filters">
        <label>
          Page path
          <input
            disabled={!!imported}
            placeholder="All captured pages"
            value={page}
            onChange={(e) => setPage(e.target.value)}
          />
        </label>
        <label>
          Device
          <select disabled={!!imported} value={device} onChange={(e) => setDevice(e.target.value)}>
            <option value="all">All devices</option>
            <option>desktop</option>
            <option>tablet</option>
            <option>mobile</option>
          </select>
        </label>
        <label>
          Layout revision
          <input
            disabled={!!imported}
            placeholder="All revisions"
            value={layout}
            onChange={(e) => setLayout(e.target.value)}
          />
        </label>
        <label>
          Viewport width ±20px
          <input
            type="number"
            min="1"
            disabled={!!imported}
            placeholder="Any width"
            value={viewport}
            onChange={(e) => setViewport(e.target.value)}
          />
        </label>
        <label>
          Time window
          <select
            disabled={!!imported}
            value={windowDays}
            onChange={(e) => setWindowDays(e.target.value)}
          >
            <option value="all">All available</option>
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </label>
      </div>
      {error ? (
        <p role="alert">{error.message} · Check endpoint authorization and narrow your filters.</p>
      ) : null}
      <div className="cm-stats">
        <div className="cm-stat">
          <strong>{report.events.toLocaleString()}</strong>
          <span>Captured event records</span>
        </div>
        <div className="cm-stat">
          <strong>{report.sessions}</strong>
          <span>Observed sessions</span>
        </div>
        <div className="cm-stat">
          <strong>{report.counts["dead-click"] ?? 0}</strong>
          <span>Dead-click signals</span>
        </div>
        <div className="cm-stat">
          <strong>{report.counts["rage-click"] ?? 0}</strong>
          <span>Rage-click signals</span>
        </div>
      </div>
      {!data.length ? (
        <div className="cm-empty">
          <h3>
            {isLoading
              ? "Reading your adapter…"
              : page || device !== "all" || windowDays !== "all" || viewport
                ? "No events match this cohort."
                : "Your first event starts here."}
          </h3>
          <p>
            Adjust filters or enable capture, interact with the page, then refresh. Check consent
            and browser privacy signals if nothing arrives.
          </p>
          <button type="button" onClick={() => void reload()}>
            Check for events
          </button>
        </div>
      ) : (
        <div className="cm-grid">
          <div>
            <h3>Elements to investigate</h3>
            <table>
              <thead>
                <tr>
                  <th>Target</th>
                  <th>Clicks</th>
                  <th>Dead</th>
                  <th>Rage</th>
                </tr>
              </thead>
              <tbody>
                {report.elements.slice(0, 8).map((e) => (
                  <tr key={e.target}>
                    <td>
                      <button
                        type="button"
                        aria-pressed={selection === e.target}
                        onClick={() => inspect(e.target)}
                      >
                        {e.target}
                      </button>
                    </td>
                    <td>{e.clicks}</td>
                    <td>{e.deadSignals}</td>
                    <td>{e.rageSignals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!report.elements.length ? (
              <p className="cm-muted">No element selectors in this cohort.</p>
            ) : null}
            <p>
              <small>
                Select a target to locate it in the current app. Stable{" "}
                <code>data-clickmap-id</code> names survive markup changes.
              </small>
            </p>
          </div>
          <div>
            <h3>How far did scrolling sessions reach?</h3>
            {report.scroll.bands.map((b) => (
              <div className="cm-scrollrow" key={b.depth}>
                <span>{b.depth}%</span>
                <div className="cm-bar">
                  <i style={{ width: `${b.ratio * 100}%` }} />
                </div>
                <span>{Math.round(b.ratio * 100)}%</span>
              </div>
            ))}
            <small>
              {report.scroll.sessions} session-route-layout observations. Non-scrolling visits are
              absent.
            </small>
          </div>
        </div>
      )}
      <div className="cm-actions">
        <button
          type="button"
          disabled={!overlay && (!data.length || !!imported)}
          onClick={() => {
            if (overlay) {
              setOverlay(false);
              return;
            }
            if (!compatible()) return;
            if (data.some((e) => Math.abs(e.viewport.width - window.innerWidth) > 40)) {
              setNotice(
                "Viewport widths differ. Filter to matching viewport dimensions or capture this session before overlaying.",
              );
              return;
            }
            setOverlay(!overlay);
          }}
        >
          {" "}
          {overlay ? "Hide" : "Show"} current-page heatmap
        </button>
        <button type="button" onClick={() => void reload()} disabled={isLoading}>
          {isLoading ? "Refreshing…" : "Refresh events"}
        </button>
        {imported ? (
          <button
            type="button"
            onClick={() => {
              setImported(null);
              setOverlay(false);
              setSelection("");
              setNotice("");
            }}
          >
            Return to live adapter
          </button>
        ) : null}
      </div>
      <output aria-live="polite">{notice}</output>
      <details className="cm-note">
        <summary>Read this evidence correctly</summary>
        <ul>
          {report.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
        <p>
          Overlay coordinates describe the captured layout. Filter to one revision and device; an
          overlay cannot reconstruct a different page.
        </p>
      </details>
      <details>
        <summary>Payload and setup diagnostics</summary>
        <p>
          Project: <code>{projectId}</code> · Collector → adapter → cohort → evidence. No data
          leaves this component except through your adapter or an export you request.
        </p>
        <pre>
          {JSON.stringify(
            data[0] ?? {
              status: "No event received",
              checks: [
                "Provider enabled",
                "Consent granted when required",
                "DNT/GPC not active",
                "Adapter endpoint reachable",
              ],
            },
            null,
            2,
          )}
        </pre>
      </details>
      <div className="cm-bottom">
        <small>
          Portable evidence · schema v1
          <br />
          Review application paths and selectors before sharing.
        </small>
        <div className="cm-actions">
          <button
            type="button"
            disabled={
              !adapter.deleteEvents || !!imported || (!page && windowDays === "all") || !data.length
            }
            onClick={async () => {
              if (
                !window.confirm(
                  `Delete the events matching this page/time cohort from your adapter? This cannot be undone.`,
                )
              )
                return;
              try {
                const count = await adapter.deleteEvents?.(query);
                setOverlay(false);
                await reload();
                setNotice(
                  `Deleted ${count ?? 0} matching records. Rebuild managed rollups as required.`,
                );
              } catch (error) {
                setNotice(`Deletion failed: ${(error as Error).message}`);
              }
            }}
          >
            Delete scoped events
          </button>
          <button
            type="button"
            onClick={() =>
              download(
                JSON.stringify(bundle, null, 2),
                "clickmap-evidence.json",
                "application/json",
              )
            }
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() =>
              download(evidenceMarkdown(bundle), "clickmap-report.md", "text/markdown")
            }
          >
            Markdown
          </button>
          <button
            type="button"
            onClick={() => download(evidenceCsv(bundle), "clickmap-elements.csv", "text/csv")}
          >
            CSV
          </button>
          <button
            type="button"
            disabled={!overlay}
            onClick={() => void heatmap.current?.download("clickmap-overlay.png")}
          >
            Overlay PNG
          </button>
          <button type="button" onClick={() => file.current?.click()}>
            Import evidence
          </button>
          <input
            ref={file}
            hidden
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                if (f.size > 10000000) throw new Error("Evidence file exceeds 10MB");
                setImported(validateEvidence(JSON.parse(await f.text())));
                setOverlay(false);
                setSelection("");
                setNotice("Evidence imported locally. Nothing uploaded.");
              } catch (err) {
                setNotice((err as Error).message);
              }
              e.target.value = "";
            }}
          />
        </div>
      </div>
      {overlay ? (
        <>
          <button type="button" className="cm-overlay-close" onClick={() => setOverlay(false)}>
            Close heatmap · Esc
          </button>
          <Heatmap ref={heatmap} adapter={cohort} coordinateSpace="document" zIndex={20000} />
        </>
      ) : null}
    </section>
  );
}
