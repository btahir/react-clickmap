import { timingSafeEqual } from "node:crypto";
import { createClickmapRouteHandlers } from "@react-clickmap/next/server";
import { createPostgresAdapter } from "@react-clickmap/postgres";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const token = process.env.CLICKMAP_ADMIN_TOKEN;
const authorize = (request: Request) => {
  if (!token || token.length < 24) return false;
  const a = Buffer.from(request.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${token}`);
  return a.length === b.length && timingSafeEqual(a, b);
};
// Single-process demo rate limit. For multiple replicas, use your shared ingress limiter.
let windowStart = Date.now();
let received = 0;
const handlers = createClickmapRouteHandlers(createPostgresAdapter({ sql: pool }), {
  projectId: "self-hosted",
  authorize,
  allowedOrigins: [process.env.CLICKMAP_APP_ORIGIN ?? "http://localhost:4315"],
  authorizeIngest: () => {
    if (Date.now() - windowStart > 60000) {
      windowStart = Date.now();
      received = 0;
    }
    return ++received <= 120;
  },
});
async function handle(request: Request) {
  if (!process.env.DATABASE_URL || !token || token.length < 24)
    return Response.json(
      { error: "Configure DATABASE_URL and CLICKMAP_ADMIN_TOKEN (at least 24 characters)" },
      { status: 503 },
    );
  return handlers[request.method as keyof typeof handlers](request);
}
export { handle as GET, handle as POST, handle as DELETE, handle as OPTIONS };
