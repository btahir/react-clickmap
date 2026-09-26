# Self-hosted Clickmap example

A complete app with explicit capture consent, Postgres persistence, bounded ingestion, a server-owned project, and a separately authorized Studio. No external analytics service or model.

From repository root, using Node 22+:

```sh
pnpm install --frozen-lockfile
pnpm --filter react-clickmap --filter @react-clickmap/postgres --filter @react-clickmap/next --filter @react-clickmap/dashboard build
export DATABASE_URL='postgres://YOUR_LOCAL_DATABASE'
export CLICKMAP_ADMIN_TOKEN='YOUR_RANDOM_TOKEN_AT_LEAST_24_CHARACTERS'
pnpm --filter @react-clickmap/self-hosted migrate
pnpm --filter @react-clickmap/self-hosted dev
```

Open http://localhost:4315, enable capture, create a note, enter your admin token and inspect the event. Collection flushes every 5 seconds; Studio refreshes every 3 seconds. A token is never needed by normal capture clients. Dashboard reads and deletes require it. Invalid configuration returns 503 rather than exposing data.

For a persistent Node deployment, build and start instead of dev. Supply `CLICKMAP_APP_ORIGIN` with your HTTPS origin, put the application behind TLS and your organization's authentication, and configure distributed ingestion rate limits at the proxy. The included 120 requests/minute limiter is process-local demonstration code. Use a least-privilege Postgres role, database backups, retention scheduling, and a protected migration process. Do not put tokens/database URLs in public environment variables. This example is intended for one project; multi-tenant authorization is an application responsibility.

Admin deletion uses DELETE `/api/clickmap?to=UNIX_MILLISECONDS` with the same bearer token and project ownership. Review the cohort before issuing destructive commands. Rollups are invalidated on deletion; rebuild with `rollupDaily` as needed. Keep raw data if you need to recompute metrics; retention and complete historical analysis are different promises.
