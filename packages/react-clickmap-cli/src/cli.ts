import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import type { CaptureEvent, CaptureType, DeviceType, HeatmapQuery } from "react-clickmap";

const DEFAULT_PORT = 3334;
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_DATA_PATH = ".react-clickmap/events.json";

const VALID_CAPTURE_TYPES = new Set<CaptureType>([
  "click",
  "dead-click",
  "scroll",
  "pointer-move",
  "rage-click",
]);

const VALID_DEVICES = new Set<HeatmapQuery["device"]>(["all", "desktop", "tablet", "mobile"]);

interface CliOptions {
  host: string;
  port: number;
  dataFile: string;
}

function printHelp(): void {
  console.log(`react-clickmap-cli

Usage:
  react-clickmap [options]

Options:
  --port <number>      Port to bind (default: ${DEFAULT_PORT})
  --host <address>     Host to bind (default: ${DEFAULT_HOST})
  --data <file>        Path to JSON event store (default: ${DEFAULT_DATA_PATH})
  --help               Show this help

What this starts:
  1) POST/GET/DELETE API at /api/clickmap
  2) Local preview dashboard at /
`);
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    dataFile: resolve(process.cwd(), DEFAULT_DATA_PATH),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg) {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    if (arg === "--port") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("Missing value for --port");
      }

      const parsed = Number(next);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`Invalid --port value: ${next}`);
      }

      options.port = parsed;
      index += 1;
      continue;
    }

    if (arg === "--host") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("Missing value for --host");
      }

      options.host = next;
      index += 1;
      continue;
    }

    if (arg === "--data") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("Missing value for --data");
      }

      options.dataFile = resolve(process.cwd(), next);
      index += 1;
      continue;
    }

    if (arg.startsWith("--port=")) {
      const parsed = Number(arg.slice("--port=".length));
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`Invalid --port value: ${arg}`);
      }

      options.port = parsed;
      continue;
    }

    if (arg.startsWith("--host=")) {
      options.host = arg.slice("--host=".length);
      continue;
    }

    if (arg.startsWith("--data=")) {
      options.dataFile = resolve(process.cwd(), arg.slice("--data=".length));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function ensureStoreFile(dataFile: string): void {
  mkdirSync(dirname(dataFile), { recursive: true });

  if (!existsSync(dataFile)) {
    writeFileSync(dataFile, "[]\n", "utf8");
  }
}

function readStore(dataFile: string): CaptureEvent[] {
  ensureStoreFile(dataFile);

  try {
    const raw = readFileSync(dataFile, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as CaptureEvent[]) : [];
  } catch {
    return [];
  }
}

function writeStore(dataFile: string, events: CaptureEvent[]): void {
  ensureStoreFile(dataFile);
  writeFileSync(dataFile, JSON.stringify(events, null, 2), "utf8");
}

function toFiniteNumber(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toPositiveInteger(value: string | null): number | undefined {
  const parsed = toFiniteNumber(value);
  if (typeof parsed !== "number") {
    return undefined;
  }

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

function parseTypes(value: string | null): CaptureType[] | undefined {
  if (!value) {
    return undefined;
  }

  const types = value
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment): segment is CaptureType => VALID_CAPTURE_TYPES.has(segment as CaptureType));

  return types.length > 0 ? types : undefined;
}

function parseDevice(value: string | null): HeatmapQuery["device"] | undefined {
  if (!value) {
    return undefined;
  }

  if (!VALID_DEVICES.has(value as HeatmapQuery["device"])) {
    return undefined;
  }

  return value as DeviceType | "all";
}

function parseQuery(searchParams: URLSearchParams): HeatmapQuery {
  const query: HeatmapQuery = {};

  const page = searchParams.get("page");
  if (page) {
    query.page = page;
  }

  const routeKey = searchParams.get("routeKey");
  if (routeKey) {
    query.routeKey = routeKey;
  }

  const sessionId = searchParams.get("sessionId");
  if (sessionId) {
    query.sessionId = sessionId;
  }

  const projectId = searchParams.get("projectId");
  if (projectId) {
    query.projectId = projectId;
  }

  const userId = searchParams.get("userId");
  if (userId) {
    query.userId = userId;
  }

  const from = toFiniteNumber(searchParams.get("from"));
  if (typeof from === "number") {
    query.from = from;
  }

  const to = toFiniteNumber(searchParams.get("to"));
  if (typeof to === "number") {
    query.to = to;
  }

  const types = parseTypes(searchParams.get("types"));
  if (types) {
    query.types = types;
  }

  const device = parseDevice(searchParams.get("device"));
  if (device) {
    query.device = device;
  }

  const limit = toPositiveInteger(searchParams.get("limit"));
  if (typeof limit === "number") {
    query.limit = limit;
  }

  return query;
}

function matchesQuery(event: CaptureEvent, query: HeatmapQuery): boolean {
  if (query.page && event.pathname !== query.page) {
    return false;
  }

  if (query.routeKey && event.routeKey !== query.routeKey) {
    return false;
  }

  if (query.sessionId && event.sessionId !== query.sessionId) {
    return false;
  }

  if (query.projectId && event.projectId !== query.projectId) {
    return false;
  }

  if (query.userId && event.userId !== query.userId) {
    return false;
  }

  if (query.device && query.device !== "all" && event.deviceType !== query.device) {
    return false;
  }

  if (query.types && query.types.length > 0 && !query.types.includes(event.type)) {
    return false;
  }

  if (typeof query.from === "number" && event.timestamp < query.from) {
    return false;
  }

  if (typeof query.to === "number" && event.timestamp > query.to) {
    return false;
  }

  return true;
}

function filterEvents(events: CaptureEvent[], query: HeatmapQuery): CaptureEvent[] {
  const filtered = events.filter((event) => matchesQuery(event, query));

  if (typeof query.limit === "number" && query.limit > 0) {
    return filtered.slice(0, query.limit);
  }

  return filtered;
}

function hasFilters(query: HeatmapQuery): boolean {
  return Object.keys(query).length > 0;
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, rejectBody) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 5_000_000) {
        request.destroy();
        rejectBody(new Error("Payload too large"));
      }
    });

    request.on("end", () => {
      resolveBody(body);
    });

    request.on("error", (error) => {
      rejectBody(error);
    });
  });
}

function setCommonHeaders(response: ServerResponse): void {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,DELETE,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type,authorization");
  response.setHeader("cache-control", "no-store");
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function dashboardHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>react-clickmap local dashboard</title>
  <style>
    :root {
      --bg: #071321;
      --panel: rgba(7, 18, 34, 0.82);
      --card: rgba(9, 27, 48, 0.74);
      --text: #e5f0ff;
      --muted: #98afc8;
      --border: rgba(128, 197, 255, 0.2);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Avenir Next", "Segoe UI", "IBM Plex Sans", sans-serif;
      color: var(--text);
      background:
        radial-gradient(70% 50% at 0% 0%, rgba(86, 161, 255, 0.24), transparent 60%),
        radial-gradient(80% 60% at 100% 100%, rgba(255, 161, 84, 0.2), transparent 60%),
        linear-gradient(150deg, #040c17, #09192d 45%, #131326 100%);
      min-height: 100vh;
      padding: 18px;
    }
    .wrap {
      max-width: 1100px;
      margin: 0 auto;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 18px;
      box-shadow: 0 24px 80px rgba(1, 8, 23, 0.55);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }
    h1 {
      margin: 0;
      font-size: 30px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-family: "Avenir Next Condensed", "Franklin Gothic Medium", "Segoe UI", sans-serif;
    }
    .sub { margin: 6px 0 0; color: var(--muted); font-size: 14px; }
    .controls { display: flex; gap: 8px; flex-wrap: wrap; }
    button {
      border: 1px solid var(--border);
      border-radius: 10px;
      background: linear-gradient(140deg, rgba(13, 35, 59, 0.9), rgba(12, 18, 34, 0.8));
      color: var(--text);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 700;
      padding: 9px 12px;
      cursor: pointer;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 10px;
      margin-bottom: 10px;
    }
    .metric {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 12px;
    }
    .metric label {
      display: block;
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .metric strong { display: block; margin-top: 6px; font-size: 22px; }
    .grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 10px;
      align-items: start;
    }
    .panel {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 12px;
    }
    .panel h2 {
      margin: 0 0 10px;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #cce4ff;
    }
    canvas {
      width: 100%;
      height: 360px;
      background: rgba(5, 13, 26, 0.9);
      border-radius: 12px;
      border: 1px solid rgba(122, 176, 230, 0.2);
      display: block;
    }
    ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
    li {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 8px;
      display: flex;
      justify-content: space-between;
      gap: 10px;
      font-size: 12px;
      color: #e0efff;
      background: rgba(5, 12, 24, 0.64);
    }
    code {
      font-family: "IBM Plex Mono", "SFMono-Regular", Menlo, monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 75%;
    }
    .status { margin-top: 10px; color: var(--muted); font-size: 12px; }
    @media (max-width: 900px) {
      .grid { grid-template-columns: 1fr; }
      canvas { height: 280px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div>
        <h1>react-clickmap local</h1>
        <p class="sub">Self-hosted preview dashboard. endpoint: <code>/api/clickmap</code></p>
      </div>
      <div class="controls">
        <button id="reload">Reload</button>
        <button id="clear">Delete All</button>
      </div>
    </div>

    <div class="metrics">
      <div class="metric"><label>Total Events</label><strong id="m-total">0</strong></div>
      <div class="metric"><label>Clicks</label><strong id="m-clicks">0</strong></div>
      <div class="metric"><label>Rage Clicks</label><strong id="m-rage">0</strong></div>
      <div class="metric"><label>Dead Clicks</label><strong id="m-dead">0</strong></div>
      <div class="metric"><label>Scroll Events</label><strong id="m-scroll">0</strong></div>
      <div class="metric"><label>Sessions</label><strong id="m-sessions">0</strong></div>
    </div>

    <div class="grid">
      <section class="panel">
        <h2>Heatmap</h2>
        <canvas id="canvas"></canvas>
      </section>

      <section class="panel">
        <h2>Top Pages</h2>
        <ul id="pages"></ul>
      </section>
    </div>

    <p class="status" id="status">Loading…</p>
  </div>

  <script>
    var endpoint = '/api/clickmap';
    var status = document.getElementById('status');
    var canvas = document.getElementById('canvas');
    var context = canvas.getContext('2d');
    var pagesNode = document.getElementById('pages');

    var metrics = {
      total: document.getElementById('m-total'),
      clicks: document.getElementById('m-clicks'),
      rage: document.getElementById('m-rage'),
      dead: document.getElementById('m-dead'),
      scroll: document.getElementById('m-scroll'),
      sessions: document.getElementById('m-sessions')
    };

    var latestEvents = [];

    function number(value) {
      return new Intl.NumberFormat('en-US').format(value);
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function resizeCanvas() {
      var bounds = canvas.getBoundingClientRect();
      canvas.width = Math.floor(bounds.width);
      canvas.height = Math.floor(bounds.height);
      drawHeatmap(latestEvents);
    }

    function drawSpot(x, y, strength, color) {
      var radius = 18 + strength * 30;
      var gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }

    function drawHeatmap(events) {
      context.clearRect(0, 0, canvas.width, canvas.height);

      for (var i = 0; i < events.length; i += 1) {
        var event = events[i];
        if (!(typeof event.x === 'number' && typeof event.y === 'number')) {
          continue;
        }

        var x = Math.max(0, Math.min(canvas.width, (event.x / 100) * canvas.width));
        var y = Math.max(0, Math.min(canvas.height, (event.y / 100) * canvas.height));

        var color = 'rgba(94, 186, 255, 0.24)';
        if (event.type === 'rage-click') {
          color = 'rgba(255, 111, 69, 0.3)';
        } else if (event.type === 'dead-click') {
          color = 'rgba(255, 194, 92, 0.28)';
        } else if (event.type === 'pointer-move') {
          color = 'rgba(109, 224, 186, 0.16)';
        }

        var strength = 0.45;
        if (event.type === 'rage-click') {
          strength = 1;
        } else if (event.type === 'dead-click') {
          strength = 0.72;
        }

        drawSpot(x, y, strength, color);
      }
    }

    function renderMetrics(events) {
      var sessions = new Set();
      var pages = new Map();
      var clicks = 0;
      var rage = 0;
      var dead = 0;
      var scroll = 0;

      for (var i = 0; i < events.length; i += 1) {
        var event = events[i];
        sessions.add(event.sessionId);
        pages.set(event.pathname, (pages.get(event.pathname) || 0) + 1);

        if (event.type === 'click') clicks += 1;
        else if (event.type === 'rage-click') rage += 1;
        else if (event.type === 'dead-click') dead += 1;
        else if (event.type === 'scroll') scroll += 1;
      }

      metrics.total.textContent = number(events.length);
      metrics.clicks.textContent = number(clicks);
      metrics.rage.textContent = number(rage);
      metrics.dead.textContent = number(dead);
      metrics.scroll.textContent = number(scroll);
      metrics.sessions.textContent = number(sessions.size);

      pagesNode.innerHTML = '';
      Array.from(pages.entries())
        .sort(function (a, b) { return b[1] - a[1]; })
        .slice(0, 7)
        .forEach(function (entry) {
          var pathname = entry[0];
          var count = entry[1];
          var li = document.createElement('li');
          li.innerHTML = '<code>' + escapeHtml(pathname) + '</code><strong>' + number(count) + '</strong>';
          pagesNode.appendChild(li);
        });

      if (pagesNode.children.length === 0) {
        var empty = document.createElement('li');
        empty.textContent = 'No events yet.';
        pagesNode.appendChild(empty);
      }
    }

    async function loadEvents() {
      try {
        var response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error('Request failed: ' + response.status);
        }

        var payload = await response.json();
        latestEvents = Array.isArray(payload.events) ? payload.events : [];
        renderMetrics(latestEvents);
        drawHeatmap(latestEvents);
        status.textContent = 'Loaded ' + number(latestEvents.length) + ' events from ' + new Date().toLocaleTimeString() + '.';
      } catch (error) {
        status.textContent = 'Load error: ' + (error && error.message ? error.message : String(error));
      }
    }

    document.getElementById('reload').addEventListener('click', loadEvents);
    document.getElementById('clear').addEventListener('click', async function () {
      var confirmed = window.confirm('Delete all local clickmap events?');
      if (!confirmed) {
        return;
      }

      var response = await fetch(endpoint, { method: 'DELETE' });
      if (response.ok) {
        await loadEvents();
      }
    });

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    loadEvents();
    setInterval(loadEvents, 4000);
  </script>
</body>
</html>`;
}

async function handlePost(
  request: IncomingMessage,
  response: ServerResponse,
  dataFile: string,
): Promise<void> {
  const rawBody = await readBody(request);
  const parsed = rawBody.trim() ? (JSON.parse(rawBody) as unknown) : null;

  const incoming = Array.isArray(parsed)
    ? (parsed as CaptureEvent[])
    : parsed && Array.isArray((parsed as { events?: CaptureEvent[] }).events)
      ? ((parsed as { events: CaptureEvent[] }).events as CaptureEvent[])
      : [];

  const existing = readStore(dataFile);
  existing.push(...incoming);
  writeStore(dataFile, existing);

  sendJson(response, 202, {
    ok: true,
    saved: incoming.length,
    total: existing.length,
  });
}

function handleGet(response: ServerResponse, dataFile: string, query: HeatmapQuery): void {
  const events = filterEvents(readStore(dataFile), query);

  sendJson(response, 200, {
    events,
    total: events.length,
  });
}

function handleDelete(response: ServerResponse, dataFile: string, query: HeatmapQuery): void {
  const existing = readStore(dataFile);

  if (!hasFilters(query)) {
    writeStore(dataFile, []);
    sendJson(response, 200, { ok: true, deleted: existing.length, remaining: 0 });
    return;
  }

  const remaining = existing.filter((event) => !matchesQuery(event, query));
  const deleted = existing.length - remaining.length;
  writeStore(dataFile, remaining);

  sendJson(response, 200, { ok: true, deleted, remaining: remaining.length });
}

async function start(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  ensureStoreFile(options.dataFile);

  const server = createServer(async (request, response) => {
    setCommonHeaders(response);

    if (!request.url) {
      sendJson(response, 400, { error: "Missing request URL" });
      return;
    }

    const requestUrl = new URL(request.url, `http://${options.host}:${options.port}`);

    if (request.method === "OPTIONS") {
      response.statusCode = 204;
      response.end();
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/") {
      response.statusCode = 200;
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(dashboardHtml());
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (requestUrl.pathname === "/api/clickmap") {
      try {
        const query = parseQuery(requestUrl.searchParams);

        if (request.method === "POST") {
          await handlePost(request, response, options.dataFile);
          return;
        }

        if (request.method === "GET") {
          handleGet(response, options.dataFile, query);
          return;
        }

        if (request.method === "DELETE") {
          handleDelete(response, options.dataFile, query);
          return;
        }
      } catch (error) {
        sendJson(response, 500, {
          error: error instanceof Error ? error.message : "Unexpected server error",
        });
        return;
      }
    }

    sendJson(response, 404, { error: "Not found" });
  });

  server.listen(options.port, options.host, () => {
    console.log("react-clickmap local preview running");
    console.log(`Dashboard: http://${options.host}:${options.port}`);
    console.log(`Ingest API: http://${options.host}:${options.port}/api/clickmap`);
    console.log(`Data file: ${options.dataFile}`);
  });

  const shutdown = (): void => {
    console.log("\nShutting down react-clickmap local preview...");
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
