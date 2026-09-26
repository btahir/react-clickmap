# react-clickmap

**Find friction in your React app. Keep the evidence in your database.**

An MIT-licensed React collector with an optional inspection workbench, storage adapters, and local diagnostic tools. Capture clicks, scrolls, and frustration signals; inspect the actual app; export evidence you and your coding agent can read.

[Working demo](https://react-clickmap.vercel.app/) · [Documentation](https://react-clickmap.vercel.app/docs) · [Source](https://github.com/btahir/react-clickmap)

## Install

```sh
npm install react-clickmap @react-clickmap/dashboard
```

The Studio release is prepared in this branch. Until published, use the workspace instructions below; registry versions may not include Studio yet.

```tsx
'use client';
import { ClickmapProvider, memoryAdapter } from 'react-clickmap';
import { ClickmapStudio } from '@react-clickmap/dashboard';

// Module scope keeps the adapter stable. Memory is a local demo, not durable storage.
const adapter = memoryAdapter();

export function Demo() {
  return (
    <ClickmapProvider adapter={adapter} projectId="demo" layoutId="pricing-v1">
      <main>
        <button data-clickmap-id="start-project">Start a project</button>
      </main>
      <ClickmapStudio adapter={adapter} projectId="demo" layoutId="pricing-v1" />
    </ClickmapProvider>
  );
}
```

Studio provides cohort filters, first-event diagnostics, element inspection, cumulative scroll reach, real heatmap overlays, JSON/Markdown/CSV export, overlay PNG, and local evidence import. It is a separate package; it never enters the collector bundle unless you import it. Put production Studio behind your application's admin authorization.

## Persistence and access

Use `fetchAdapter` to send events to your own endpoint. Public ingestion and authorized analytics reads/deletes have different access requirements. The Next.js server entry is **`@react-clickmap/next/server`**, with mandatory server-owned `projectId`; reads/deletes fail closed without an authorization callback. Ingestion validates event fields and byte/batch limits. Origin checks supplement authorization; configure your edge/server rate limits for a public deployment.

[Complete Next.js recipe](https://react-clickmap.vercel.app/docs/guides/nextjs-app-router) · [Persistence](https://react-clickmap.vercel.app/docs/guides/persistence)

| Package | Role |
| --- | --- |
| `react-clickmap` | React capture, renderers, memory/localStorage/fetch adapters |
| `react-clickmap/contracts` | Pure Node/browser validation, query matching, evidence and deterministic reports |
| `@react-clickmap/dashboard` | Optional `ClickmapStudio` and embeddable dashboard |
| `@react-clickmap/next` | Explicit `/server` and `/client` entries |
| `@react-clickmap/postgres` | Durable storage, checked-out pool connections, scoped queries, rollups |
| `@react-clickmap/supabase` | REST storage with verified pagination; aggregation is client-side |
| `@react-clickmap/cli` | Loopback collector, evidence validation/reporting, local retention tools |

## Privacy is a configuration, not a certification

DNT and GPC disable capture by default. Configure `consentRequired` and `hasConsent` for your application. Query strings are excluded from captured route keys. Generated selectors omit DOM IDs/classes; use deliberate `data-clickmap-id` values. Input/contenteditable selectors are masked by default, and `data-clickmap-ignore` excludes a subtree. `normalizeRoute` can replace identifier-bearing path segments; `beforeCapture` can redact or discard an event before transport. Layout IDs are application-controlled.

Events still contain pseudonymous session IDs, paths, coordinates, and optional user IDs. Masking a selector does not erase coordinates. Avoid sensitive content in paths and stable IDs. Cookie-free collection does not establish consent or legal compliance. Inspect payloads and your own deployment requirements.

## Read metrics correctly

Observed sessions are sessions with captured interactions, **not all visitors**. Scroll reach counts one maximum per project/session/route/layout; repeated visits in the same session are combined. Dead/rage clicks are heuristics. Event shares are not conversion or failure rates. Studio warns about small samples and bounded datasets. Overlay coordinates cannot reconstruct an older or differently sized page; select a compatible cohort.

## Local evidence tools

```sh
npx @react-clickmap/cli --help
react-clickmap serve --project demo --origin http://localhost:3000
react-clickmap validate --file clickmap-evidence.json
react-clickmap report --file clickmap-evidence.json --format markdown
react-clickmap doctor --data .react-clickmap/events.json
react-clickmap prune --data .react-clickmap/events.json --before 2026-01-01
# Inspect the dry-run count, then add --apply to prune.
```

The collector binds to loopback, prints a session token for reads/deletes, and writes atomically. It is not a multi-process production database. CLI reports do not call an AI model. Exported IDs are pseudonymized and query strings/user IDs removed; application paths and target names still need review before sharing. The agent skill is shipped in the core package at `skills/clickmap/SKILL.md`.

## Run the workspace

Use Node 22+ and pnpm 9.

```sh
pnpm install --frozen-lockfile
pnpm --filter react-clickmap build
pnpm --filter @react-clickmap/dashboard build
pnpm --filter @react-clickmap/docs dev
```

The demo explicitly labels synthetic data and lets you capture only your own tab into memory. Reloading clears it. No telemetry is sent to the maintainer.

## Independent maintenance

Tourlight, Kino, Clickmap, and Redact remain free and MIT licensed. Shared **React Maintainer Support** helps fund maintenance, documentation, compatibility updates, and development across all four. Sponsorship is voluntary and gives no exclusive features; support is shared across the React package family. No payment integration is required to use these packages.

[License](https://github.com/btahir/react-clickmap/blob/main/LICENSE)

[Support this project](https://react-tourlight.vercel.app/support)
