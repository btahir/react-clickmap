import { describe, expect, it } from "vitest";
import { memoryAdapter } from "../src/adapters/memory-adapter";
import {
  buildReport,
  createEvidence,
  evidenceCsv,
  scopedAdapter,
  scrollReach,
  validateEvents,
  validateEvidence,
  validateQuery,
} from "../src/contracts";
import { createEvent } from "./fixtures";

describe("trustworthy portable evidence", () => {
  it("counts cumulative session-route reach, unaffected by repeated scroll records", () => {
    const a = createEvent({ type: "scroll", sessionId: "a", depth: 90, maxDepth: 90 });
    const b = createEvent({ type: "scroll", sessionId: "b", depth: 20, maxDepth: 20 });
    const r = scrollReach([a, b, a, a]);
    expect(r.sessions).toBe(2);
    expect(r.average).toBe(55);
    expect(r.bands.find((x) => x.depth === 20)?.ratio).toBe(1);
    expect(r.bands.find((x) => x.depth === 90)?.ratio).toBe(0.5);
  });
  it("rejects malformed versions, coordinates and arbitrary unbounded queries", () => {
    expect(() => validateEvents([{ ...createEvent(), x: NaN }])).toThrow();
    expect(() => validateEvents([{ ...createEvent(), schemaVersion: 9 }])).toThrow();
    expect(() => validateQuery({ limit: 100001 })).toThrow();
    expect(() => validateQuery({ from: 10, to: 1 })).toThrow();
  });
  it("strips extra payloads and query secrets and preserves selected evidence", () => {
    const a = {
      ...createEvent({ userId: "email@example.com", routeKey: "/pricing?token=secret" }),
      secret: "hide",
    };
    const bundle = createEvidence([a], {
      routeKey: "/pricing?token=secret",
      userId: "email@example.com",
    });
    expect(JSON.stringify(bundle)).not.toContain("secret");
    expect(JSON.stringify(bundle)).not.toContain("email@example.com");
    expect(buildReport(bundle).events).toBe(1);
    expect(bundle.completeness).toBe("bounded");
    expect(validateEvidence({ ...bundle, secret: "hide" })).not.toHaveProperty("secret");
  });
  it("preserves cross-project sessions and protects spreadsheet formulas", () => {
    const events = [
      createEvent({ projectId: "a", selector: "=cmd" }),
      createEvent({ projectId: "b", selector: "=cmd" }),
    ];
    const bundle = createEvidence(events);
    expect(buildReport(bundle).sessions).toBe(2);
    expect(new Set(bundle.events.map((e) => e.sessionId)).size).toBe(2);
    expect(evidenceCsv(bundle)).toContain("'=cmd");
  });
  it("locks every overlay to the selected cohort and intersects event types", async () => {
    const adapter = memoryAdapter([
      createEvent({ projectId: "a", layoutId: "v1" }),
      createEvent({ projectId: "b", layoutId: "v2" }),
    ]);
    const scoped = scopedAdapter(adapter, { projectId: "a", layoutId: "v1", viewportMin: 900 });
    expect(await scoped.load({ projectId: "b" })).toHaveLength(1);
    expect(await scoped.load({ types: ["scroll"] })).toHaveLength(0);
  });
  it("deduplicates retried ingestion", async () => {
    const a = createEvent();
    const m = memoryAdapter();
    await m.save([a, a]);
    await m.save([a]);
    expect(await m.load({})).toHaveLength(1);
  });
});
