# Verification record — 2026-09-25

This records local checks for the Studio upgrade. It does not claim a hosted deployment, npm publication, search indexing, legal compliance or market demand.

## Reproduce

Use Node 22+ and the repository's pinned pnpm version. Install with `pnpm install --frozen-lockfile`, then:

```sh
pnpm -r --filter './packages/**' build
pnpm test:run
pnpm test:tools
pnpm test:postgres
pnpm test:packed
pnpm --filter react-clickmap validate:pkg
pnpm --filter react-clickmap budget
pnpm --filter @react-clickmap/docs build
pnpm --filter @react-clickmap/self-hosted build
pnpm exec playwright install chromium
pnpm test:browser
```

Browser tests start the built docs app on 4312, or reuse a running instance. Rebuild/restart an existing instance after source edits. No GitHub CI is installed.

## Evidence

- **122 unit tests passed:** core 62, Postgres 33, Supabase 19, dashboard 8. Cover collector opt-outs and lifecycle, contracts, adapters, geometry/metrics, pagination/limits, SQL parameterization and deletion.
- **Local HTTP/tool integration passed:** pure Node contracts/server imports, Next read/delete authorization and project/body boundaries; spawned CLI ingest/dedup/read/scoped-delete; wrong-origin rejection; app-origin inspector denial; escaped inline token; filtered evidence export and deterministic report/validation commands.
- **Embedded PostgreSQL engine passed:** actual migrations and queries in PGlite 0.3.14; deduplication, project/layout/viewport filters, raw aggregation, idempotent rollup, partial deletion, other-project preservation and rollup rebuild. A midnight record confirms inclusive-from/exclusive-to equivalence. Two-day partial rollup and late rage insertion confirm fallback plus distinct intensity/event count. Pool-shaped executor fixture confirms checkout/release without calling pool.query for transactions.
- **Packed consumers passed:** all six npm tarballs include README/license. Isolated Node imports pure contracts/server and Postgres; an independent real Next 16.1.6 App Router production build imports the packed Studio client component, pure server contract and authenticated route helpers. Temporary consumer directories are removed by the test.
- **Desktop/mobile Chromium: 6 tests passed.** Real capture→target inspection→overlay→JSON download→cohort invalidation→import; DNT prevents capture; invalid imports report errors; 390px view has no page overflow; runtime page errors absent. Documentation has server-rendered text, canonical link and successful robots/sitemap/llms responses.
- **Production builds passed:** package declaration builds, docs and self-hosted Next app. Docs landing explicitly separates synthetic samples from actual tab capture. Parent reviewer independently exercised real collection, target highlighting and heatmap UI.
- **Package versions prepared:** core/Postgres 0.4.0, Supabase 0.3.0, Studio/Next/CLI 0.2.0; no npm publication. Registry `npm view ... versions --json` checked all six on this date: none of these target versions were present.
- **Package validation:** publint and ATTW's ESM-only profile. Legacy Node 10 TypeScript resolution is not supported for subpath exports; modern bundler/Node 16 ESM resolution is checked.
- **Collector budget:** full core runtime gzip 17,818 bytes against 18 KiB budget. Studio, CLI and server tooling are separate entries/packages. This modestly increases the old 17 KiB ceiling; no smaller obsolete marketing claim remains.

An early external PGlite probe used `to = next midnight - 1`, accidentally testing raw fallback instead of daily bins. The committed test corrects this to exact midnight and exercises the actual daily path; the corrected checks passed.

## Limits and operator checks

No hosted Supabase instance, production Postgres pool under concurrent load, RLS policy or deployment was exercised. PGlite verifies PostgreSQL query semantics, not network failures or managed-service policy. The runnable self-hosted app builds with real pg types, but its full deployed database/auth flow still needs environment-specific operator testing. Test-browser coverage is Chromium desktop/mobile, not a Safari/Firefox compatibility certification.

Offset pagination is deterministic for unchanged data but not a transaction snapshot of concurrent writes/deletes. CLI storage is intentionally single-process; localStorage is single-tab best effort. The example rate limiter is process-local, and its bearer token is a minimal development example rather than a replacement for organization authentication. Out-of-process retention jobs must use the same rollup invalidation rules.

Studio browser tests download and inspect JSON, Markdown, CSV and PNG signatures; PNG remains an overlay-only canvas export, not DOM screenshot capture. Stable IDs/layout revisions and normalized paths are application responsibilities. No evidence here proves conversion improvements or that capture covers all visitors.
