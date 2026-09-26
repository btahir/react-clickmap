# Clickmap architecture

## Product boundary

Clickmap helps a React team inspect captured interactions on its own application and carry evidence into a design or code review. The collector remains usable without Studio, a hosted service, an account, or a model API. Studio is an optional admin/developer surface, not a security boundary.

| Layer | Package / source | Responsibility |
| --- | --- | --- |
| Collector and renderer | `react-clickmap` | Consent-aware capture, batching, stable targets, heatmap rendering and lightweight adapters |
| Pure evidence contract | `react-clickmap/contracts` | Event/query validation, cohort matching, session-route-revision scroll reach, versioned evidence and deterministic reports; no React/DOM import |
| Inspection UI | `@react-clickmap/dashboard` | Existing dashboard plus app-embedded Studio, filters, diagnostics, target inspection, evidence import/export |
| HTTP boundary | `@react-clickmap/next/server` | Server-owned project, bounded validated ingestion, authenticated reads/deletes; pure server entry |
| Next client | `@react-clickmap/next/client` | Fetch adapter and pathname-only route hook; client directive preserved in built output |
| Persistence | Postgres / Supabase packages | SQL transactions/aggregation or bounded REST pagination; never place administrative credentials in browser code |
| Local tools | `@react-clickmap/cli` | Loopback event inbox, authenticated reads/deletes/export, deterministic validate/doctor/report and scoped retention |
| Runnable app | `apps/self-hosted` | Real Next/pg capture plus authorized Studio; explicit capture choice and operator configuration |

## Capture and privacy

The capture engine collects interaction coordinates and metadata, not DOM snapshots, screenshots, typed values or text content. Default selectors use explicit non-sensitive `data-clickmap-id` values or structural paths, not arbitrary IDs/classes. Masking defaults are additive with application selectors. Query strings are excluded from generated route keys. Applications must normalize sensitive path segments and may reject/sanitize records with `beforeCapture`.

`consentRequired`, `hasConsent`, DNT/GPC, sampling and enabled state control collection. The library cannot determine legal consent requirements. Cookie-free collection is not a compliance guarantee. Even sanitized exports can reveal application-provided paths and target names. The inspector excludes its click/pointer subtree; scroll is measured at document level, including scrolling performed during inspection.

## Measurement contract

Time windows are half-open: `from <= timestamp < to`. Cohort matching includes project, page/route, session/user where authorized, device, event types, layout revision and viewport width. Capture records are not unique user actions: derived dead/rage signals may accompany ordinary clicks. Session counts describe interacting observed sessions, not all visitors.

Scroll reach first takes the maximum per project/session/route/layout, then computes cumulative reach thresholds. Repeated page visits in the same session and revision are combined; no separate pageview or exposure denominator is claimed. Heatmap bin intensity may weight rage events; `totalEvents` separately counts coordinate-bearing records.

Studio only paints overlays or locates a target when a known single page matches the current pathname, a single known revision matches the mounted revision, and overlay viewport widths are compatible. Cohort changes close the overlay and clear the selection. Historical coordinate compatibility is still an application judgment; equal revision labels cannot prove equal DOM layout.

## HTTP and storage trust boundaries

Next handlers require a server-owned project. GET/DELETE deny by default without an `authorize` callback. Ingest is public unless `authorizeIngest` is provided; body and batch limits are enforced, and project mismatches fail. Origin policy limits browser access and does not authenticate clients. Use real application authentication and ingress rate limiting in production. Read caps fail explicitly rather than silently returning partial evidence. Deletion requires narrower scope than an entire project.

The CLI binds to loopback, validates Host and Origin, and never enables application-origin CORS for the inspector HTML that contains its local admin token. API reads, deletes and evidence exports require a bearer token. It is a trusted local developer tool, not a multi-user hosted server. The JSON store is single-process, bounded, atomically replaced and created mode 0600. Corrupt files fail closed; no silent overwrite. Browser localStorage has no multi-tab transaction guarantee.

Postgres pools are checked out once per adapter operation/rollup; transaction queries stay on that connection and it is released in `finally`. Raw aggregation is the default. Opt-in daily bins require compatible day-aligned queries; weighted coverage is checked against raw records before using bins. Missing/partial/stale coverage falls back to raw aggregation. Deletion invalidates affected project rollups atomically. Rollups serialize overlapping project/route scopes on a shared day lock. The coverage check costs a raw count scan; it prioritizes correct reports over an unverified fast path.

Supabase REST reads require exact Content-Range totals, paginate with timestamp plus event-ID ordering, honor a hard maximum, and reject incomplete/inconsistent responses. Aggregation is client-side and explicitly reports that capability. Concurrent changes during offset pagination can still change a live read; use a stable time window/retention policy or a database snapshot workflow when exact reproducibility is required.

## Evidence and portability

Version 1 evidence contains schema, creation time, source, completeness, validated query and whitelisted records. Export removes user identity and query strings, aliases project/session pairs consistently, and does not preserve arbitrary imported properties. Unknown schema versions fail validation. Completeness defaults to `bounded`; only a source proving the full queried set may label it `complete`.

Studio JSON import remains in memory and never writes to the connected adapter. JSON preserves cohort metadata; Markdown/CSV derive from the same deterministic report. CSV guards formula-leading cells. PNG exports the heatmap overlay only, not a screenshot of the underlying application. The CLI's authenticated evidence endpoint uses the same contract as Studio. The shipped agent skill instructs agents to use local validated evidence and avoid causal or population claims.

## Release and compatibility

The minor Changesets version step is applied: core/Postgres 0.4.0, Supabase 0.3.0, Studio/Next/CLI 0.2.0, with changelogs and lockfile updated. Publish the six packages together so optional packages receive the new core contract dependency. Private example/docs apps remain 0.0.0. Changesets `privatePackages.version/tag` are disabled because these apps are neither npm artifacts nor independent release products; public packages retain normal versioning. These are ESM packages; TypeScript consumers should use `moduleResolution: bundler`, `node16` or `nodenext`. Core runtime and dashboard preserve client directives; pure contracts and Next server entries do not.

Behavior changes include pathname-only route keys, safer selectors, half-open time windows, cumulative scroll reach, fail-closed Next authorization and explicit server project configuration. Historical records are readable, but comparison across capture conventions requires explicit cohort separation. No CI workflow, deployment or npm publication is part of this change.
