import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createEvidence } from "../packages/react-clickmap/dist/contracts.js";
import { createClickmapRouteHandlers } from "../packages/react-clickmap-next/dist/server.js";

const temp = mkdtempSync(join(tmpdir(), "clickmap-verify-"));
const cli = resolve("packages/react-clickmap-cli/dist/cli.js");
const event = {
  schemaVersion: 1,
  eventVersion: 1,
  eventId: "one",
  projectId: "test",
  sessionId: "s1",
  timestamp: Date.now(),
  pathname: "/",
  routeKey: "/",
  deviceType: "desktop",
  viewport: { width: 1440, height: 900, scrollX: 0, scrollY: 0 },
  type: "click",
  x: 25,
  y: 35,
  pointerType: "mouse",
};
let events = [];
const adapter = {
  save: async (data) => {
    events.push(...data);
  },
  load: async () => events,
  deleteEvents: async () => {
    const count = events.length;
    events = [];
    return count;
  },
};
const handlers = createClickmapRouteHandlers(adapter, {
  projectId: "test",
  authorize: (req) => req.headers.get("authorization") === "Bearer test",
  maxBodyBytes: 2000,
  maxBatchSize: 2,
});
const req = (method, body, headers = {}) =>
  new Request("http://localhost/api/clickmap", {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
    headers,
  });
assert.equal((await handlers.GET(req("GET"))).status, 401);
assert.equal((await handlers.POST(req("POST", [{ ...event, projectId: "other" }]))).status, 403);
assert.equal((await handlers.POST(req("POST", [{ ...event, x: Infinity }]))).status, 400);
assert.equal((await handlers.POST(req("POST", [event, event, event]))).status, 400);
assert.equal(
  (await handlers.POST(req("POST", [event], { origin: "https://untrusted.example" }))).status,
  403,
);
assert.equal((await handlers.POST(req("POST", [event]))).status, 202);
assert.equal((await handlers.GET(req("GET", null, { authorization: "Bearer test" }))).status, 200);
assert.equal(
  (await handlers.DELETE(req("DELETE", null, { authorization: "Bearer test" }))).status,
  400,
);
assert.equal(
  (
    await handlers.DELETE(
      new Request("http://localhost/api/clickmap?sessionId=s1", {
        method: "DELETE",
        headers: { authorization: "Bearer test" },
      }),
    )
  ).status,
  200,
);
const doc = join(temp, "evidence.json");
writeFileSync(doc, JSON.stringify(createEvidence([event], {}, "captured", "complete")));
assert.match(
  execFileSync(process.execPath, [cli, "validate", "--file", doc], { encoding: "utf8" }),
  /"valid":true/,
);
assert.match(
  execFileSync(process.execPath, [cli, "report", "--file", doc], { encoding: "utf8" }),
  /Observed sessions: 1/,
);
const port = 4382;
const data = join(temp, "events.json");
const testToken = "test-token</script><script>globalThis.injected=true</script>";
const child = spawn(
  process.execPath,
  [
    cli,
    "serve",
    "--port",
    String(port),
    "--data",
    data,
    "--project",
    "test",
    "--origin",
    "http://localhost:4312",
  ],
  { env: { ...process.env, CLICKMAP_TOKEN: testToken }, stdio: ["ignore", "pipe", "pipe"] },
);
try {
  await new Promise((res, rej) => {
    const timer = setTimeout(() => rej(Error("CLI startup timeout")), 10000);
    child.stdout.on("data", (d) => {
      if (String(d).includes("local inspector")) {
        clearTimeout(timer);
        res();
      }
    });
    child.once("exit", (code) => rej(Error(`CLI exited ${code}`)));
  });
  const url = `http://127.0.0.1:${port}/api/clickmap`;
  assert.equal((await fetch(url)).status, 401);
  const blockedRoot = await fetch(`http://127.0.0.1:${port}/`, {
    headers: { origin: "http://localhost:4312" },
  });
  const localHtml = await (await fetch(`http://127.0.0.1:${port}/`)).text();
  assert.ok(!localHtml.includes(testToken), "inline bearer token must be escaped");
  assert.ok(localHtml.includes("\\u003c/script>"));
  assert.equal(blockedRoot.status, 403);
  assert.equal(blockedRoot.headers.get("access-control-allow-origin"), null);
  assert.ok(!(await blockedRoot.text()).includes("test-token"));
  assert.equal(
    (
      await fetch(url, {
        method: "POST",
        body: JSON.stringify([event]),
        headers: { origin: "https://bad.example" },
      })
    ).status,
    403,
  );
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await fetch(url, {
          method: "POST",
          body: JSON.stringify([event]),
          headers: { origin: "http://localhost:4312" },
        })
      ).status,
      202,
    );
  const response = await fetch(url, { headers: { authorization: `Bearer ${testToken}` } });
  assert.equal((await response.json()).events.length, 1);
  assert.equal(JSON.parse(readFileSync(data)).length, 1);
  const exported = await fetch(`${url}/evidence?page=${encodeURIComponent(event.pathname)}`, {
    headers: { authorization: `Bearer ${testToken}` },
  });
  const evidence = await exported.json();
  assert.equal(evidence.query.page, event.pathname);
  assert.equal(evidence.events.length, 1);
  assert.equal(evidence.completeness, "complete");
  assert.equal(
    (await fetch(url, { method: "DELETE", headers: { authorization: `Bearer ${testToken}` } }))
      .status,
    400,
  );
  assert.equal(
    (
      await fetch(`${url}?sessionId=s1`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${testToken}` },
      })
    ).status,
    200,
  );
  console.log(
    "PASS: pure Node imports, Next authorization/validation/project boundaries, evidence CLI and real HTTP ingestion/deduplication/read/delete.",
  );
} finally {
  child.kill("SIGTERM");
  await new Promise((res) => child.once("exit", res));
  rmSync(temp, { recursive: true, force: true });
}
