import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const repo = process.cwd();
const { createPostgresAdapter, rollupDaily } = await import(
  pathToFileURL(`${repo}/packages/react-clickmap-postgres/dist/index.js`)
);
const db = new PGlite();
const sql = {
  async query(text, params) {
    const result = await db.query(text, params ? [...params] : undefined);
    return { ...result, rowCount: result.affectedRows ?? result.rows.length };
  },
};
try {
  for (const file of ["0001_init.sql", "0002_document_coordinates.sql"])
    await db.exec(await readFile(`${repo}/packages/react-clickmap-postgres/sql/${file}`, "utf8"));
  const start = Date.parse("2026-09-24T00:00:00Z");
  const base = (eventId, sessionId = "a", projectId = "p1") => ({
    schemaVersion: 1,
    eventVersion: 1,
    eventId,
    projectId,
    sessionId,
    timestamp: start + 1000,
    pathname: "/pricing",
    routeKey: "/pricing",
    deviceType: sessionId === "a" ? "desktop" : "mobile",
    layoutId: sessionId === "a" ? "revision-a" : "revision-b",
    viewport: { width: sessionId === "a" ? 1200 : 390, height: 800, scrollX: 0, scrollY: 0 },
  });
  const click = (id, session, project = "p1") => ({
    ...base(id, session, project),
    type: "click",
    x: session === "a" ? 10 : 70,
    y: 20,
    docX: session === "a" ? 10 : 70,
    docY: 10,
    docWidth: 1200,
    docHeight: 1600,
    selector: '[data-clickmap-id="pricing"]',
    pointerType: "mouse",
  });
  const scroll = (id, session, depth) => ({
    ...base(id, session),
    type: "scroll",
    depth,
    maxDepth: depth,
  });
  const events = [
    { ...click("boundary", "a"), timestamp: start + 86400000 },
    click("a-click", "a"),
    click("b-click", "b"),
    scroll("a-scroll-1", "a", 50),
    scroll("a-scroll-2", "a", 90),
    scroll("b-scroll", "b", 20),
    click("other", "a", "p2"),
  ];
  const adapter = createPostgresAdapter({ sql });
  const rolled = createPostgresAdapter({ sql, preferDailyBins: true });
  await adapter.save(events);
  await adapter.save(events);
  assert.equal(
    (await adapter.load({ projectId: "p1" })).length,
    6,
    "idempotent insertion / project filter",
  );
  assert.equal(
    (await adapter.load({ projectId: "p1", layoutId: "revision-a" })).length,
    4,
    "layout filter",
  );
  assert.equal(
    (await adapter.load({ projectId: "p1", viewportMin: 1000 })).length,
    4,
    "viewport filter",
  );
  const query = { projectId: "p1", from: start, to: start + 86400000 };
  const weight = (value) => value.bins.reduce((sum, bin) => sum + Number(bin.value), 0);
  assert.equal(
    weight(await adapter.loadAggregated(query)),
    2,
    "raw aggregate excludes next-midnight record",
  );
  assert.equal((await adapter.loadAggregated(query)).totalEvents, 2);
  await rollupDaily(sql, { day: "2026-09-24", projectId: "p1" });
  await rollupDaily(sql, { day: "2026-09-24", projectId: "p1" });
  assert.equal(
    weight(await rolled.loadAggregated(query)),
    2,
    "actual UTC-midnight daily-bin path matches raw",
  );
  assert.equal((await rolled.loadAggregated(query)).totalEvents, 2);
  assert.equal(
    await adapter.deleteEvents({ projectId: "p1", sessionId: "a" }),
    4,
    "delete returns affected raw rows",
  );
  assert.equal((await adapter.load({ projectId: "p1" })).length, 2, "surviving raw rows");
  assert.equal(
    weight(await rolled.loadAggregated(query)),
    1,
    "aggregate survives partial deletion accurately",
  );
  assert.equal(
    (await adapter.load({ projectId: "p2" })).length,
    1,
    "other project remains untouched",
  );
  await rollupDaily(sql, { day: "2026-09-24", projectId: "p1" });
  assert.equal(weight(await rolled.loadAggregated(query)), 1, "rollup rebuild after deletion");
  await assert.rejects(() => adapter.deleteEvents({}), /filter/i, "unscoped deletion rejected");
  const day2 = start + 86400000;
  await adapter.save([
    click("p3-day1", "a", "p3"),
    { ...click("p3-day2", "b", "p3"), timestamp: day2 + 1000 },
  ]);
  await rollupDaily(sql, { day: "2026-09-24", projectId: "p3" });
  const twoDays = { projectId: "p3", from: start, to: day2 + 86400000 };
  assert.equal(
    weight(await rolled.loadAggregated(twoDays)),
    2,
    "partially rolled date range falls back to raw",
  );
  await adapter.save([
    {
      ...click("p3-late", "a", "p3"),
      type: "rage-click",
      clusterSize: 3,
      windowMs: 600,
      radiusPx: 40,
    },
  ]);
  assert.equal(
    weight(await rolled.loadAggregated(twoDays)),
    4,
    "late insertion invalidates weighted coverage",
  );
  assert.equal(
    (await rolled.loadAggregated(twoDays)).totalEvents,
    3,
    "event count differs from intensity",
  );
  let checkouts = 0,
    releases = 0;
  const pool = {
    query: async () => {
      throw Error("pool.query must never run a transaction");
    },
    connect: async () => {
      checkouts++;
      return {
        ...sql,
        release: () => {
          releases++;
        },
      };
    },
  };
  const pooled = createPostgresAdapter({ sql: pool });
  await pooled.save([click("pool-save", "a", "pool")]);
  await pooled.load({ projectId: "pool" });
  await rollupDaily(pool, { day: "2026-09-24", projectId: "pool" });
  assert.equal(checkouts, 3, "one checked-out connection per operation");
  assert.equal(releases, checkouts, "all pool connections released");
  console.log(
    JSON.stringify({
      result: "passed",
      checks: [
        "real PostgreSQL schema migrations",
        "idempotent insert",
        "project/layout/viewport filtering",
        "raw aggregation",
        "idempotent daily rollup",
        "partial deletion count",
        "aggregate invalidation and surviving data",
        "other project isolation",
        "rollup rebuild",
        "unscoped delete rejection",
        "midnight boundary / raw-rollup equality",
        "partial daily coverage and late insertion fallback",
        "event count versus weighted intensity",
        "pool connection checkout and release",
      ],
    }),
  );
} finally {
  await db.close();
}
