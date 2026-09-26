import type { ClickmapAdapter, HeatmapQuery } from "react-clickmap";
import { validateEvents, validateQuery } from "react-clickmap/contracts";
export interface ClickmapRouteCorsOptions {
  origin?: string;
  headers?: string[];
  methods?: string[];
  maxAgeSeconds?: number;
}
export type ClickmapRouteHandler = (request: Request) => Promise<Response>;
export interface ClickmapRouteHandlers {
  GET: ClickmapRouteHandler;
  POST: ClickmapRouteHandler;
  DELETE: ClickmapRouteHandler;
  OPTIONS: ClickmapRouteHandler;
}
export interface ClickmapRouteHandlersOptions {
  projectId: string;
  /** Required for GET/DELETE. Fail closed when omitted. */
  authorize?: (request: Request, operation: "read" | "delete") => boolean | Promise<boolean>;
  authorizeIngest?: (request: Request) => boolean | Promise<boolean>;
  /** Explicit browser origins; same-origin requests are accepted by default. */
  allowedOrigins?: string[];
  maxBodyBytes?: number;
  maxBatchSize?: number;
  maxReadEvents?: number;
  cors?: ClickmapRouteCorsOptions;
  onError?: (error: unknown, request: Request) => Response | Promise<Response>;
}
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function queryFrom(request: Request): HeatmapQuery {
  const entries: Record<string, unknown> = {};
  for (const [k, v] of new URL(request.url).searchParams)
    entries[k] = ["from", "to", "limit", "viewportMin", "viewportMax"].includes(k)
      ? Number(v)
      : k === "types"
        ? v.split(",")
        : v;
  return validateQuery(entries);
}
async function readJson(request: Request, maxBytes: number): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new HttpError(413, "Payload too large");
  if (!request.body) throw new HttpError(400, "Missing body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "Payload too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const c of chunks) {
    body.set(c, offset);
    offset += c.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}
export function createClickmapRouteHandlers(
  adapter: ClickmapAdapter,
  options: ClickmapRouteHandlersOptions,
): ClickmapRouteHandlers {
  if (!options?.projectId) throw new Error("Clickmap requires a server-owned projectId");
  const origins =
    options.allowedOrigins ??
    (options.cors?.origin && options.cors.origin !== "*" ? [options.cors.origin] : []);
  const handle: ClickmapRouteHandler = async (request) => {
    const origin = request.headers.get("origin");
    const reply = (value: unknown, status = 200) =>
      new Response(value === null ? null : JSON.stringify(value), {
        status,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
          ...(origin && origins.includes(origin)
            ? {
                "access-control-allow-origin": origin,
                vary: "Origin",
                "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
                "access-control-allow-headers": "content-type,authorization",
              }
            : {}),
        },
      });
    try {
      if (origin && origin !== new URL(request.url).origin && !origins.includes(origin))
        return reply({ error: "Origin denied" }, 403);
      if (request.method === "OPTIONS") return reply(null, 204);
      if (request.method === "POST") {
        if (options.authorizeIngest && !(await options.authorizeIngest(request)))
          return reply({ error: "Ingest denied" }, 403);
        const body = await readJson(request, options.maxBodyBytes ?? 262144);
        const raw = Array.isArray(body) ? body : (body as { events?: unknown })?.events;
        let events: ReturnType<typeof validateEvents>;
        try {
          events = validateEvents(raw, options.maxBatchSize ?? 500);
        } catch (e) {
          throw new HttpError(400, (e as Error).message);
        }
        if (events.some((e) => e.projectId !== options.projectId))
          return reply({ error: "Project mismatch" }, 403);
        await adapter.save(events.map((e) => ({ ...e, projectId: options.projectId })));
        return reply({ ok: true, saved: events.length }, 202);
      }
      const operation = request.method === "DELETE" ? "delete" : "read";
      if (!options.authorize || !(await options.authorize(request, operation)))
        return reply({ error: "Authorization required" }, 401);
      let query: HeatmapQuery;
      try {
        query = queryFrom(request);
      } catch (e) {
        throw new HttpError(400, (e as Error).message);
      }
      if (query.projectId && query.projectId !== options.projectId)
        return reply({ error: "Project mismatch" }, 403);
      query.projectId = options.projectId;
      if (request.method === "DELETE") {
        if (!adapter.deleteEvents) return reply({ error: "Deletion not supported" }, 405);
        if (
          !["page", "routeKey", "sessionId", "userId", "from", "to", "layoutId"].some(
            (k) => query[k as keyof HeatmapQuery] !== undefined,
          )
        )
          return reply({ error: "Deletion requires a narrower filter than project alone" }, 400);
        return reply({ deleted: await adapter.deleteEvents(query) });
      }
      const cap = Math.min(query.limit ?? 10000, options.maxReadEvents ?? 10000);
      const events = await adapter.load({ ...query, limit: cap + 1 });
      if (events.length > cap)
        return reply({ error: "Query exceeds result limit; narrow the cohort" }, 413);
      return reply({ events, complete: true });
    } catch (error) {
      if (error instanceof HttpError) return reply({ error: error.message }, error.status);
      if (options.onError) return options.onError(error, request);
      return reply({ error: "Clickmap request failed" }, 500);
    }
  };
  return { GET: handle, POST: handle, DELETE: handle, OPTIONS: handle };
}
