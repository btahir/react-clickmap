import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import {
  buildReport,
  type CaptureEvent,
  createEvidence,
  evidenceCsv,
  evidenceMarkdown,
  matchesQuery,
  validateEvents,
  validateEvidence,
  validateQuery,
} from "react-clickmap/contracts";

const args = process.argv.slice(2);
const command = args[0] && !args[0].startsWith("-") ? args.shift() : "serve";
const option = (name: string, fallback = "") => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? fallback : (args[i + 1] ?? fallback);
};
const file = resolve(option("data", ".react-clickmap/events.json"));
function read(): CaptureEvent[] {
  if (!existsSync(file)) return [];
  return validateEvents(JSON.parse(readFileSync(file, "utf8")), 100000);
}
function write(events: CaptureEvent[]) {
  mkdirSync(dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  try {
    writeFileSync(temp, JSON.stringify(events), { mode: 0o600 });
    renameSync(temp, file);
  } finally {
    if (existsSync(temp)) unlinkSync(temp);
  }
}
function dedup(events: CaptureEvent[]) {
  return [...new Map(events.map((e) => [e.eventId, e])).values()];
}
async function main() {
  if (args.includes("--help")) {
    console.log(
      `Clickmap local tools\n\nreact-clickmap serve [--port 3334] [--data .react-clickmap/events.json] [--project default] [--origin http://localhost:3000]\nreact-clickmap validate --file evidence.json\nreact-clickmap report --file evidence.json [--format markdown|json|csv]\nreact-clickmap doctor --data events.json\nreact-clickmap prune --data events.json --before 2026-01-01 [--apply]\n\nLoopback only. Read/delete access uses a generated session token (or CLICKMAP_TOKEN). Ingest is bounded and project-bound. Store errors stop writes. Reports run locally without AI or network calls.`,
    );
    return;
  }
  if (command === "validate" || command === "report") {
    const input = option("file");
    if (!input) throw new Error("--file is required");
    const raw = readFileSync(resolve(input), "utf8");
    if (Buffer.byteLength(raw) > 10000000) throw new Error("File exceeds 10MB");
    const doc = validateEvidence(JSON.parse(raw));
    if (command === "validate") {
      console.log(JSON.stringify({ valid: true, version: doc.version, events: doc.events.length }));
      return;
    }
    const format = option("format", "markdown");
    console.log(
      format === "json"
        ? JSON.stringify(buildReport(doc), null, 2)
        : format === "csv"
          ? evidenceCsv(doc)
          : evidenceMarkdown(doc),
    );
    return;
  }
  if (command === "doctor") {
    const events = read();
    console.log(
      JSON.stringify(
        {
          valid: true,
          events: events.length,
          projects: [...new Set(events.map((e) => e.projectId))],
          store: file,
          latestEvent: events.length
            ? new Date(events.reduce((latest, e) => Math.max(latest, e.timestamp), 0)).toISOString()
            : null,
          notes: [
            "Local file collector. Not a multi-process database.",
            "No hidden telemetry. No remote model.",
          ],
        },
        null,
        2,
      ),
    );
    return;
  }
  if (command === "prune") {
    const before = Date.parse(option("before"));
    if (!Number.isFinite(before)) throw new Error("--before requires an ISO date");
    const events = read();
    const kept = events.filter((e) => e.timestamp >= before);
    if (args.includes("--apply")) write(kept);
    console.log(
      JSON.stringify({ matched: events.length - kept.length, applied: args.includes("--apply") }),
    );
    return;
  }
  if (command !== "serve") throw new Error(`Unknown command: ${command}`);
  const host = option("host", "127.0.0.1");
  if (!["127.0.0.1", "localhost", "::1"].includes(host))
    throw new Error(
      "Local preview binds to loopback only. Use the authorized Next.js/Postgres recipe for a shared deployment.",
    );
  const port = Number(option("port", "3334"));
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid port");
  const project = option("project", "default");
  const allowed = option("origin");
  const token = process.env.CLICKMAP_TOKEN || randomBytes(24).toString("hex");
  read(); // refuse to start on corrupt data
  const authorized = (header: string | undefined) => {
    const a = Buffer.from(header ?? "");
    const b = Buffer.from(`Bearer ${token}`);
    return a.length === b.length && timingSafeEqual(a, b);
  };
  const server = createServer(async (req, res) => {
    const origin = req.headers.origin;
    const ownOrigins = [
      `http://127.0.0.1:${port}`,
      `http://localhost:${port}`,
      `http://[::1]:${port}`,
    ];
    const send = (status: number, data: unknown) => {
      res.writeHead(status, {
        "content-type": "application/json",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      });
      res.end(JSON.stringify(data));
    };
    if (
      ![`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`].includes(req.headers.host ?? "")
    ) {
      send(403, { error: "Host denied" });
      return;
    }
    if (origin && !ownOrigins.includes(origin) && origin !== allowed) {
      send(403, { error: "Origin denied" });
      return;
    }
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    const api = url.pathname === "/api/clickmap" || url.pathname === "/api/clickmap/evidence";
    if (!api && origin && !ownOrigins.includes(origin)) {
      send(403, { error: "Inspector is same-origin only" });
      return;
    }
    if (origin && api) {
      res.setHeader("access-control-allow-origin", origin);
      res.setHeader("vary", "Origin");
      res.setHeader("access-control-allow-methods", "GET,POST,DELETE,OPTIONS");
      res.setHeader("access-control-allow-headers", "authorization,content-type");
    }
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (url.pathname === "/health") {
      send(200, { ok: true, project });
      return;
    }
    if (url.pathname === "/" && req.method === "GET") {
      res.writeHead(200, {
        "content-type": "text/html",
        "cache-control": "no-store",
        "x-frame-options": "DENY",
        "content-security-policy":
          "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'",
      });
      res.end(html(token, project));
      return;
    }
    if (!api) {
      send(404, { error: "Not found" });
      return;
    }
    try {
      if (url.pathname.endsWith("/evidence") && req.method !== "GET") {
        send(405, { error: "Method not allowed" });
        return;
      }
      if (req.method === "POST") {
        let body = "";
        let bytes = 0;
        for await (const chunk of req) {
          bytes += Buffer.byteLength(chunk);
          if (bytes > 262144) {
            send(413, { error: "Payload too large" });
            return;
          }
          body += chunk;
        }
        const json = JSON.parse(body);
        const events = validateEvents(Array.isArray(json) ? json : json.events, 500);
        if (events.some((e) => e.projectId !== project)) {
          send(403, { error: "Project mismatch" });
          return;
        }
        const all = dedup([...read(), ...events]);
        if (all.length > 100000) {
          send(413, { error: "Store limit reached; export or prune events" });
          return;
        }
        write(all);
        send(202, { saved: events.length });
        return;
      }
      if (!authorized(req.headers.authorization)) {
        send(401, { error: "Bearer token required" });
        return;
      }
      const raw = Object.fromEntries(
        [...url.searchParams].map(([k, v]) => [
          k,
          ["from", "to", "limit", "viewportMin", "viewportMax"].includes(k)
            ? Number(v)
            : k === "types"
              ? v.split(",")
              : v,
        ]),
      );
      const q = validateQuery(raw);
      if (q.projectId && q.projectId !== project) {
        send(403, { error: "Project mismatch" });
        return;
      }
      q.projectId = project;
      const all = read();
      const selected = all.filter((e) => matchesQuery(e, q));
      if (req.method === "GET") {
        if (selected.length > (q.limit ?? 10000)) {
          send(413, { error: "Narrow the cohort: query exceeds limit" });
          return;
        }
        send(
          200,
          url.pathname.endsWith("/evidence")
            ? createEvidence(selected, q, "captured", "complete")
            : { events: selected, complete: true },
        );
        return;
      }
      if (req.method === "DELETE") {
        if (!q.to && !q.from && !q.sessionId && !q.page && !q.routeKey) {
          send(400, { error: "Deletion requires date, session or page scope" });
          return;
        }
        write(all.filter((e) => !matchesQuery(e, q)));
        send(200, { deleted: selected.length });
        return;
      }
      send(405, { error: "Method not allowed" });
    } catch (error) {
      send(400, { error: error instanceof Error ? error.message : "Request failed" });
    }
  });
  server.listen(port, host, () =>
    console.log(
      `Clickmap local inspector: http://${host}:${port}\nProject: ${project}\nStore: ${file}\nRead/delete bearer token: ${token}\nAllowed app origin: ${allowed || "same-origin only"}`,
    ),
  );
  server.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  const stop = () => server.close(() => process.exit(0));
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
function html(token: string, project: string) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Clickmap local inspector</title><style>body{font:16px/1.6 system-ui;background:#f5f5ed;color:#15352b;max-width:960px;margin:50px auto;padding:24px}h1{font-size:44px;letter-spacing:-2px}button,input{font:inherit;padding:9px 14px;background:white;border:1px solid #abb9a9;border-radius:7px}table{width:100%;text-align:left;border-collapse:collapse}td,th{padding:12px;border-bottom:1px solid #cdd6ca}pre{overflow:auto;background:white;padding:20px}small{color:#50655b}</style><header><small>CLICKMAP / LOCAL INSPECTOR</small><h1>Your first event starts here.</h1><p>This is a local event inbox. Inspect spatial overlays inside your actual React app using Clickmap Studio.</p></header><label>Page path <input id="page" placeholder="All pages"></label> <button id="refresh">Refresh</button> <button id="export">Export evidence</button><p id="status" role="status"></p><table><thead><tr><th>Time</th><th>Type</th><th>Page</th><th>Target</th></tr></thead><tbody id="rows"></tbody></table><details><summary>Connect your application</summary><pre id="setup"></pre></details><script>const token=${JSON.stringify(token).replace(/</g, "\\u003c")},project=${JSON.stringify(project).replace(/</g, "\\u003c")};let events=[];const status=document.getElementById('status');document.getElementById('setup').textContent='fetchAdapter({ endpoint: "'+location.origin+'/api/clickmap" })\nClickmapProvider projectId="'+project+'"\n\nStart the CLI with --origin matching your React app URL.\nUse the generated bearer token only in developer/admin tooling for reads and deletes.';async function load(){try{const page=document.getElementById('page').value;const r=await fetch('/api/clickmap?'+new URLSearchParams(page?{page}:{}),{headers:{Authorization:'Bearer '+token}});const body=await r.json();if(!r.ok)throw Error(body.error);events=body.events;status.textContent=events.length+' captured records • '+new Set(events.map(e=>e.sessionId)).size+' observed sessions (not all visitors)';const rows=document.getElementById('rows');rows.replaceChildren();for(const e of events.slice(-30).reverse()){const row=document.createElement('tr');for(const value of [new Date(e.timestamp).toLocaleTimeString(),e.type,e.pathname,e.selector||'—']){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}rows.append(row);}}catch(e){status.textContent=e.message;}}document.getElementById('refresh').onclick=load;document.getElementById('export').onclick=async()=>{try{const page=document.getElementById('page').value;const r=await fetch('/api/clickmap/evidence?'+new URLSearchParams(page?{page}:{}),{headers:{Authorization:'Bearer '+token}});const doc=await r.json();if(!r.ok)throw Error(doc.error);const u=URL.createObjectURL(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='clickmap-evidence.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}catch(e){status.textContent=e.message;}};load();setInterval(load,4000);</script></html>`;
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
