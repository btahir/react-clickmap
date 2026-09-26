import type { CaptureEvent, ClickmapAdapter, HeatmapQuery } from "./types";

export type { CaptureEvent, ClickmapAdapter, HeatmapQuery } from "./types";
export const EVIDENCE_VERSION = 1 as const;
const TYPES = ["click", "dead-click", "rage-click", "scroll", "pointer-move"];
const DEVICES = ["desktop", "tablet", "mobile"];
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const str = (v: unknown, max = 512): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= max;
export function validateEvents(value: unknown, maxEvents = 10000): CaptureEvent[] {
  if (!Array.isArray(value) || value.length > maxEvents)
    throw new Error(`Expected at most ${maxEvents} events`);
  return value.map((e, i) => {
    const fail = () => {
      throw new Error(`Invalid event at index ${i}`);
    };
    if (
      !record(e) ||
      e.schemaVersion !== 1 ||
      e.eventVersion !== 1 ||
      !TYPES.includes(String(e.type)) ||
      !DEVICES.includes(String(e.deviceType))
    )
      return fail();
    if (
      !["eventId", "projectId", "sessionId", "pathname", "routeKey"].every((k) =>
        str(e[k], k === "routeKey" ? 2048 : 512),
      ) ||
      !num(e.timestamp)
    )
      return fail();
    if (
      !record(e.viewport) ||
      !["width", "height", "scrollX", "scrollY"].every((k) =>
        num(
          (e.viewport as Record<string, unknown>)[k],
          k.startsWith("scroll") ? -10000000 : 0,
          10000000,
        ),
      )
    )
      return fail();
    for (const k of ["userId", "layoutId", "selector"])
      if (e[k] !== undefined && !str(e[k], k === "selector" ? 2048 : 512)) return fail();
    if (e.type === "scroll") {
      if (!num(e.depth, 0, 100) || !num(e.maxDepth, 0, 100)) return fail();
    } else {
      if (
        !num(e.x, 0, 100) ||
        !num(e.y, 0, 100) ||
        !["mouse", "touch", "pen", "unknown"].includes(String(e.pointerType))
      )
        return fail();
      for (const k of ["docX", "docY"]) if (e[k] !== undefined && !num(e[k], 0, 100)) return fail();
      for (const k of ["docWidth", "docHeight"])
        if (e[k] !== undefined && !num(e[k], 0, 10000000)) return fail();
    }
    if (
      e.type === "rage-click" &&
      !["clusterSize", "windowMs", "radiusPx"].every((k) => num(e[k], 1, 100000))
    )
      return fail();
    if (e.type === "dead-click" && e.reason !== "non-interactive-target") return fail();
    // Whitelist fields; arbitrary user-supplied properties never enter persistence.
    const keys = [
      "schemaVersion",
      "eventVersion",
      "eventId",
      "projectId",
      "sessionId",
      "userId",
      "layoutId",
      "timestamp",
      "pathname",
      "routeKey",
      "deviceType",
      "viewport",
      "type",
      ...(e.type === "scroll"
        ? ["depth", "maxDepth"]
        : ["x", "y", "docX", "docY", "docWidth", "docHeight", "selector", "pointerType"]),
      ...(e.type === "rage-click" ? ["clusterSize", "windowMs", "radiusPx"] : []),
      ...(e.type === "dead-click" ? ["reason"] : []),
    ];
    return Object.fromEntries(
      keys
        .filter((k) => e[k] !== undefined)
        .map((k) => [
          k,
          k === "viewport"
            ? Object.fromEntries(
                ["width", "height", "scrollX", "scrollY"].map((v) => [
                  v,
                  (e.viewport as Record<string, unknown>)[v],
                ]),
              )
            : e[k],
        ]),
    ) as unknown as CaptureEvent;
  });
}
export function validateQuery(value: unknown): HeatmapQuery {
  if (!record(value)) throw new Error("Expected query object");
  const q: Record<string, unknown> = {};
  for (const key of ["page", "routeKey", "sessionId", "projectId", "userId", "layoutId"])
    if (value[key] !== undefined) {
      if (!str(value[key], 2048)) throw new Error(`Invalid ${key}`);
      q[key] = value[key];
    }
  for (const key of ["from", "to", "limit", "viewportMin", "viewportMax"])
    if (value[key] !== undefined) {
      if (
        !num(value[key]) ||
        (key === "limit" &&
          (!Number.isInteger(value[key]) || Number(value[key]) < 1 || Number(value[key]) > 100000))
      )
        throw new Error(`Invalid ${key}`);
      q[key] = value[key];
    }
  for (const [a, b] of [
    ["from", "to"],
    ["viewportMin", "viewportMax"],
  ])
    if (typeof q[a!] === "number" && typeof q[b!] === "number" && Number(q[a!]) > Number(q[b!]))
      throw new Error(`Invalid ${a}/${b} range`);
  if (value.device !== undefined) {
    if (!["all", ...DEVICES].includes(String(value.device))) throw new Error("Invalid device");
    q.device = value.device;
  }
  if (value.coordinateSpace !== undefined) {
    if (!["viewport", "document"].includes(String(value.coordinateSpace)))
      throw new Error("Invalid coordinate space");
    q.coordinateSpace = value.coordinateSpace;
  }
  if (value.types !== undefined) {
    if (!Array.isArray(value.types) || !value.types.every((t) => TYPES.includes(t)))
      throw new Error("Invalid event types");
    q.types = value.types;
  }
  return q as HeatmapQuery;
}
export function matchesQuery(e: CaptureEvent, q: HeatmapQuery): boolean {
  return (
    (!q.page || e.pathname === q.page) &&
    (!q.routeKey || e.routeKey === q.routeKey) &&
    (!q.projectId || e.projectId === q.projectId) &&
    (!q.sessionId || e.sessionId === q.sessionId) &&
    (!q.userId || e.userId === q.userId) &&
    (!q.layoutId || e.layoutId === q.layoutId) &&
    (!q.device || q.device === "all" || e.deviceType === q.device) &&
    (!q.types?.length || q.types.includes(e.type)) &&
    (q.from === undefined || e.timestamp >= q.from) &&
    (q.to === undefined || e.timestamp < q.to) &&
    (q.viewportMin === undefined || e.viewport.width >= q.viewportMin) &&
    (q.viewportMax === undefined || e.viewport.width <= q.viewportMax)
  );
}
/** A shared cohort for every visual. Filtering here is defense in depth, not authorization. */
export function scopedAdapter(adapter: ClickmapAdapter, query: HeatmapQuery): ClickmapAdapter {
  return {
    save: (events) => adapter.save(events),
    load: async (child) => {
      const types =
        query.types && child.types
          ? query.types.filter((t) => child.types?.includes(t))
          : (query.types ?? child.types);
      if (types?.length === 0) return [];
      return (await adapter.load({ ...child, ...query, ...(types ? { types } : {}) })).filter(
        (e) => matchesQuery(e, query) && (!child.types || child.types.includes(e.type)),
      );
    },
  };
}
export function scrollReach(events: CaptureEvent[]) {
  const maxima = new Map<string, number>();
  for (const e of events)
    if (e.type === "scroll") {
      const key = JSON.stringify([e.projectId, e.sessionId, e.routeKey, e.layoutId]);
      maxima.set(key, Math.max(maxima.get(key) ?? 0, e.maxDepth));
    }
  const depths = [...maxima.values()];
  return {
    sessions: depths.length,
    average: depths.length ? depths.reduce((a, b) => a + b, 0) / depths.length : 0,
    bands: Array.from({ length: 10 }, (_, i) => ({
      depth: (i + 1) * 10,
      ratio: depths.length ? depths.filter((d) => d >= (i + 1) * 10).length / depths.length : 0,
    })),
  };
}
export interface EvidenceBundle {
  schema: "react-clickmap/evidence";
  version: 1;
  generatedAt: string;
  query: HeatmapQuery;
  source: "synthetic" | "captured";
  completeness: "complete" | "bounded";
  events: CaptureEvent[];
}
export function createEvidence(
  events: CaptureEvent[],
  query: HeatmapQuery = {},
  source: EvidenceBundle["source"] = "captured",
  completeness: EvidenceBundle["completeness"] = "bounded",
): EvidenceBundle {
  query = validateQuery(query);
  const sessions = new Map<string, number>();
  for (const e of events) {
    const key = JSON.stringify([e.projectId, e.sessionId]);
    if (!sessions.has(key)) sessions.set(key, sessions.size + 1);
  }
  const safe = validateEvents(events, 100000)
    .filter((e) => matchesQuery(e, query))
    .map((e, i) => {
      const { userId: _userId, ...rest } = e;
      return {
        ...rest,
        eventId: `event-${i + 1}`,
        sessionId: `session-${sessions.get(JSON.stringify([e.projectId, e.sessionId]))}`,
        pathname: e.pathname.split("?")[0] || "/",
        routeKey: e.routeKey.split("?")[0] || "/",
      };
    });
  return {
    schema: "react-clickmap/evidence",
    version: 1,
    generatedAt: new Date().toISOString(),
    query: Object.fromEntries(
      Object.entries(query)
        .filter(([k]) => !["userId", "sessionId"].includes(k))
        .map(([k, v]) => [
          k,
          typeof v === "string" && ["page", "routeKey"].includes(k) ? v.split("?")[0] : v,
        ]),
    ),
    source,
    completeness,
    events: safe,
  };
}
export function validateEvidence(value: unknown): EvidenceBundle {
  if (
    !record(value) ||
    value.schema !== "react-clickmap/evidence" ||
    value.version !== 1 ||
    !["synthetic", "captured"].includes(String(value.source)) ||
    !["complete", "bounded"].includes(String(value.completeness)) ||
    typeof value.generatedAt !== "string" ||
    !Number.isFinite(Date.parse(value.generatedAt))
  )
    throw new Error("Invalid evidence document");
  return {
    schema: "react-clickmap/evidence",
    version: 1,
    generatedAt: value.generatedAt,
    source: value.source,
    completeness: value.completeness,
    query: validateQuery(value.query),
    events: validateEvents(value.events, 100000),
  } as EvidenceBundle;
}
export function buildReport(bundle: EvidenceBundle) {
  const events = bundle.events.filter((e) => matchesQuery(e, bundle.query));
  const sessions = new Set(events.map((e) => JSON.stringify([e.projectId, e.sessionId]))).size;
  const counts = Object.fromEntries(
    TYPES.map((t) => [t, events.filter((e) => e.type === t).length]),
  );
  const elements = new Map<
    string,
    { target: string; clicks: number; deadSignals: number; rageSignals: number }
  >();
  for (const e of events)
    if ("selector" in e && e.selector) {
      const row = elements.get(e.selector) ?? {
        target: e.selector,
        clicks: 0,
        deadSignals: 0,
        rageSignals: 0,
      };
      if (e.type === "click") row.clicks++;
      if (e.type === "dead-click") row.deadSignals++;
      if (e.type === "rage-click") row.rageSignals++;
      elements.set(e.selector, row);
    }
  const warnings = [
    "Sessions count captured interactions, not all visitors.",
    "Scroll reach uses session + route + layout maxima, not distinct pageviews.",
    "Dead/rage clicks are heuristic signals, not verified failures.",
    "Exports may contain application-provided path/target names; review before sharing.",
  ];
  if (sessions < 30)
    warnings.push("Small sample: fewer than 30 observed sessions. No causal conclusions.");
  if (bundle.completeness === "bounded")
    warnings.push("Bounded dataset: totals may exclude older or additional events.");
  if (new Set(events.map((e) => e.layoutId ?? "unknown")).size > 1)
    warnings.push("Multiple layout revisions: compare separately.");
  return {
    events: events.length,
    sessions,
    counts,
    scroll: scrollReach(events),
    elements: [...elements.values()].sort(
      (a, b) =>
        b.deadSignals + b.rageSignals - (a.deadSignals + a.rageSignals) ||
        b.clicks - a.clicks ||
        a.target.localeCompare(b.target),
    ),
    warnings,
  };
}
export function evidenceMarkdown(bundle: EvidenceBundle): string {
  const r = buildReport(bundle);
  return [
    "# Clickmap evidence",
    `Source: ${bundle.source}. Generated: ${bundle.generatedAt}.`,
    `Observed events: ${r.events}. Observed sessions: ${r.sessions}.`,
    `Cohort: ${JSON.stringify(bundle.query)}`,
    "",
    "## Signals",
    ...r.elements.map(
      (e) =>
        `- ${e.target.replace(/[\r\n]/g, " ")}: ${e.clicks} clicks; ${e.deadSignals} dead signals; ${e.rageSignals} rage signals.`,
    ),
    "",
    "## Interpretation",
    ...r.warnings.map((w) => `- ${w}`),
  ].join("\n");
}
export function evidenceCsv(bundle: EvidenceBundle): string {
  const quote = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+@-]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [
    ["target", "clicks", "deadSignals", "rageSignals"],
    ...buildReport(bundle).elements.map((e) => [e.target, e.clicks, e.deadSignals, e.rageSignals]),
  ]
    .map((r) => r.map(quote).join(","))
    .join("\r\n");
}
