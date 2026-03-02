# Getting Started

## Install

```bash
npm install react-clickmap
```

## Quick setup

Wrap your app with `ClickmapProvider` and drop a `Heatmap` overlay wherever you want to visualize behavior:

```tsx
import { ClickmapProvider, Heatmap, fetchAdapter } from "react-clickmap";

// The adapter tells react-clickmap where to send and load events.
// fetchAdapter sends events to your own API endpoint via HTTP.
const adapter = fetchAdapter({ endpoint: "/api/clickmap" });

export function App() {
  return (
    <ClickmapProvider
      adapter={adapter}
      projectId="my-app"
      capture={["click", "scroll", "rage-click", "dead-click"]}
      sampleRate={0.25}
      respectDoNotTrack
      respectGlobalPrivacyControl
    >
      <YourApp />

      {/* Show a heatmap overlay for the /pricing page */}
      <Heatmap adapter={adapter} page="/pricing" type="heatmap" />
    </ClickmapProvider>
  );
}
```

That's all the client-side code you need. Events are automatically captured, batched, and sent to your endpoint.

## What happens under the hood

1. **Capture** — Browser listeners detect clicks, scrolls, pointer movement, rage clicks, and dead clicks. Each event is normalized with viewport-relative coordinates, device type, and a unique event ID.
2. **Batch** — Events are queued in an internal batcher. The batcher flushes to your adapter every 5 seconds, when 100 events accumulate, or when the user navigates away (via `pagehide`/`visibilitychange`).
3. **Persist** — Your adapter's `save()` method receives the batch. With `fetchAdapter`, this is an HTTP POST to your endpoint. You handle storage however you like.
4. **Render** — The `<Heatmap>` component calls your adapter's `load()` method to fetch events, then renders a GPU-accelerated overlay using WebGL (with Canvas fallback).

## Capture modes

| Mode | What it captures |
|---|---|
| `click` | Every click with viewport-relative `x`/`y` coordinates and pointer type |
| `dead-click` | Clicks on non-interactive elements (e.g., plain text, images) — signals layout confusion |
| `rage-click` | 3+ rapid clicks within a small radius — signals user frustration |
| `scroll` | Current scroll depth and maximum scroll depth reached |
| `pointer-move` | Mouse/touch movement coordinates — used for attention heatmaps |

Enable only the modes you need:

```tsx
<ClickmapProvider
  adapter={adapter}
  capture={["click", "scroll"]}  // Only track clicks and scroll depth
>
```

## Provider props

| Prop | Type | Default | Description |
|---|---|---|---|
| `adapter` | `ClickmapAdapter` | required | Where to save and load events |
| `projectId` | `string` | `"default"` | Scopes events by project |
| `userId` | `string` | — | Optional user identifier for per-user queries |
| `capture` | `CaptureType[]` | `["click"]` | Which event types to capture |
| `sampleRate` | `number` | `1` | Fraction of sessions to capture (0–1) |
| `flushIntervalMs` | `number` | `5000` | How often to flush the event queue |
| `maxBatchSize` | `number` | `100` | Max events per batch before flushing early |
| `respectDoNotTrack` | `boolean` | `false` | Honor the browser's Do Not Track signal |
| `respectGlobalPrivacyControl` | `boolean` | `false` | Honor the Global Privacy Control signal |
| `consentRequired` | `boolean` | `false` | Require explicit consent before capturing |
| `hasConsent` | `boolean` | — | Current consent state (used with `consentRequired`) |
| `maskSelectors` | `string[]` | `[]` | CSS selectors for elements to mask in events |
| `ignoreSelectors` | `string[]` | `[]` | CSS selectors for elements to exclude entirely |

## Choosing an adapter

react-clickmap is storage-agnostic. Pick the adapter that matches your stack:

| Adapter | Install | Use case |
|---|---|---|
| `memoryAdapter()` | built-in | Development and testing — events live in memory |
| `localStorageAdapter()` | built-in | Browser-only prototyping — events persist in localStorage |
| `fetchAdapter()` | built-in | Production — sends events to your HTTP endpoint |
| `createPostgresAdapter()` | `npm install @react-clickmap/postgres` | Direct Postgres persistence with parameterized queries |
| `createSupabaseAdapter()` | `npm install @react-clickmap/supabase` | Supabase REST API — no backend code needed |

See the [Persistence Guide](/docs/guides/persistence) for detailed setup instructions with each adapter.

## Next steps

- [Persistence Guide](/docs/guides/persistence) — Hook up a database (Postgres, Supabase, or custom)
- [Next.js App Router](/docs/guides/nextjs-app-router) — Set up with the App Router
- [Privacy & Consent](/docs/guides/privacy-consent) — Configure consent flows and data minimization
- [Components API](/docs/api/components) — Full prop reference for all components
- [Architecture](/docs/architecture) — How the capture and render pipelines work
