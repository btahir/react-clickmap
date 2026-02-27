# react-clickmap — Refined Implementation Plan (v0.1)

This refines the existing `PLAN.md` with a production-first, risk-aware path that still preserves the original product vision:

- Privacy-first, self-hosted clickmaps for React
- Zero runtime third-party dependencies in the shipped library
- Fast capture path + GPU-accelerated rendering path
- Great DX with a small, reliable API surface

## 1) Critical Refinements

### A. Toolchain stability over novelty (for v0.1)
Decision:

- Use `tsup` for the initial release build pipeline.
- Keep `Biome` + `Vitest` + `Changesets`.
- Revisit `tsdown` after Rolldown exits beta and CSS support matures.

Why:

- `tsdown` is compelling, but its docs still call out feature gaps and experimental areas.
- `tsdown` CSS support is explicitly marked early/experimental.
- `Rolldown` is still marked beta, with alpha-status minification in its own repo.

Outcome:

- Faster path to reliable releases.
- Lower publishing risk while we validate product-market fit.

---

### B. Capture model must be pointer-first (not mouse-first)
Decision:

- Replace movement tracking from mouse-only events to Pointer Events.
- Capture `pointerType` (`mouse` | `touch` | `pen`) on relevant events.

Why:

- Pointer Events are broadly supported and unify desktop + mobile + stylus behavior.
- Mouse-only plans under-count mobile interactions.

Outcome:

- Correct cross-device capture from day one.

---

### C. Privacy defaults need stronger guardrails than DNT-only
Decision:

- Keep `respectDoNotTrack`, but add `respectGlobalPrivacyControl`.
- Add built-in redaction defaults:
  - Never capture input/textarea/contenteditable values.
  - Ignore clicks in sensitive selectors by default (`input`, `textarea`, `[contenteditable]`, `[data-clickmap-mask]`).
  - Selector masking support (`maskSelectors`, `ignoreSelectors`).

Why:

- `navigator.doNotTrack` is deprecated/non-standard.
- GPC is the more modern privacy signal, though still limited availability.

Outcome:

- Better privacy-by-default posture without reducing product usability.

---

### D. Unload reliability and batching need explicit transport strategy
Decision:

- Flush policy in priority order:
  1. `visibilitychange` when page becomes `hidden`
  2. `pagehide`
  3. periodic interval flush
- Transport priority:
  1. `navigator.sendBeacon` when available
  2. `fetch(..., { keepalive: true })` fallback
- Cap keepalive payloads to <= 64 KiB per request, chunk batches when needed.

Why:

- This aligns with platform guidance for analytics-style delivery and page lifecycle behavior.

Outcome:

- Less event loss on tab close/navigation.

---

### E. Rendering capability matrix must be explicit
Decision:

- Capability tiers:
  1. **Tier 1**: Worker + OffscreenCanvas + WebGL2
  2. **Tier 2**: Worker + OffscreenCanvas + WebGL1
  3. **Tier 3**: Main thread Canvas2D fallback
- Detect support at runtime and auto-select tier.
- Handle context loss (`webglcontextlost`, restore path).

Why:

- OffscreenCanvas support is broad but nuanced (not uniform across older Safari ranges).

Outcome:

- Predictable behavior across browsers without broken overlays.

---

### F. Raw-event loading alone will not scale
Decision:

- Keep raw `load(query)` support, but add an optional aggregation contract:
  - `loadAggregated(query): Promise<AggregatedHeatmapPayload>`
- Aggregated payload supports server-side binning/tiles for high-volume pages.

Why:

- Pulling full raw point sets for large date ranges is expensive and slow.

Outcome:

- Better real-world performance at scale.

---

## 2) Refined Package Decisions

### Runtime deps policy

- Runtime deps: none (except React as peer dependency).
- Dev deps: allowed where they improve correctness/release quality.

### Recommended initial versions policy (v0.1)

- TypeScript: stable latest major-1 line (currently `^5.9`, not beta `6.0`).
- React peer deps: `>=18.2.0` (and compatible with 19.x).
- Vitest: current stable major (`^4`).
- Biome: current stable major (`^2`), exact pin in CI optional.
- Changesets: current stable line.

### Additional release-quality tooling (dev-only)

- `publint` (package export/field validation)
- `@arethetypeswrong/core` (types/package compatibility)
- Bundle budget check script (hard CI gate)

---

## 3) API Adjustments (Small but Important)

### Provider API (capture)

```tsx
<ClickmapProvider
  adapter={adapter}
  capture={['click', 'scroll', 'pointer-move', 'rage-click']}
  sampleRate={0.2}
  respectDoNotTrack={true}
  respectGlobalPrivacyControl={true}
  maskSelectors={['input', 'textarea', '[contenteditable]', '[data-clickmap-mask]']}
  ignoreSelectors={['[data-clickmap-ignore]']}
  consentRequired={false}
  hasConsent={true}
  flushIntervalMs={5000}
  enabled={true}
>
  <App />
</ClickmapProvider>
```

### Adapter interfaces (backward compatible extension)

```ts
export interface ClickmapAdapter {
  save(events: CaptureEvent[]): Promise<void>;
  load(query: HeatmapQuery): Promise<CaptureEvent[]>;
  loadAggregated?(query: HeatmapQuery): Promise<AggregatedHeatmapPayload>;
}
```

### Query and payload improvements

- Add `pointerType` and `eventVersion`.
- Add `routeKey`/`pathname` normalization for SPA route changes.
- Add `schemaVersion` field for future migrations.

---

## 4) Architecture Updates

### Capture engine

- Pointer-based click/move capture with sampling.
- Scroll depth with throttle.
- Rage click detector with tunable window/radius.
- Session-scoped deterministic sampling.
- Flush on lifecycle events + interval.
- Optional offline queue (in-memory in v0.1, persistent queue deferred).

### Rendering engine

- Single renderer facade selects capability tier.
- Worker message protocol using typed arrays/transferables where possible.
- Heatmap mode (KDE-like blur), clickmap mode (frequency dots), scrollmap mode (banded density).
- Context-lost recovery path and fatal fallback.

### Privacy subsystem

- Data minimization by default.
- Selector/value redaction hooks.
- Explicit extension points for custom masking logic.

---

## 5) Repository Structure (simplified)

For v0.1, simplify to reduce release overhead:

```text
react-clickmap/
├── packages/
│   └── react-clickmap/
│       ├── src/
│       │   ├── index.ts
│       │   ├── provider.tsx
│       │   ├── heatmap.tsx
│       │   ├── scroll-depth.tsx
│       │   ├── heatmap-thumbnail.tsx
│       │   ├── capture/
│       │   ├── render/
│       │   │   ├── worker-entry.ts
│       │   │   ├── webgl-renderer.ts
│       │   │   └── canvas-renderer.ts
│       │   ├── adapters/
│       │   ├── privacy/
│       │   └── types.ts
│       ├── tests/
│       ├── tsup.config.ts
│       ├── vitest.config.ts
│       └── package.json
├── apps/docs/
└── ...
```

Note:

- Defer separate `clickmap-worker` package until there is proven need for independent versioning.

---

## 6) Milestones with Exit Criteria

## M0 — Foundation (2-3 days)

Deliver:

- Monorepo scaffold
- Build/test/lint/release configs
- Package export validation + budget checks

Exit criteria:

- `build`, `test`, `check`, package validation all green in CI.

## M1 — Capture MVP (1 week)

Deliver:

- `ClickmapProvider`
- Pointer/click/scroll capture
- Memory + fetch adapter
- Session sampling + lifecycle flush

Exit criteria:

- End-to-end capture demo works.
- No PII values captured in default mode.

## M2 — Renderer MVP (1 week)

Deliver:

- Heatmap overlay with capability-tier fallback
- Clickmap and scrollmap base modes
- Worker path + fallback path

Exit criteria:

- Renders large synthetic dataset without freezing UI.
- Browser smoke tests pass across Chromium + WebKit.

## M3 — Privacy + Scale hardening (1 week)

Deliver:

- GPC/DNT support
- Redaction and ignore/mask selectors
- Optional aggregated adapter load path
- Error messaging polish

Exit criteria:

- Privacy checklist complete.
- Aggregated queries demonstrably reduce payload for high-volume pages.

## M4 — Docs + Launch (1 week)

Deliver:

- Docs site with runnable examples
- README rewrite with benchmark and privacy posture
- Release workflow and first npm publish

Exit criteria:

- New user can integrate capture + visualize in <10 minutes.

---

## 7) Testing Strategy Changes

### Keep

- Unit tests in Vitest + jsdom for core logic.

### Add

- Browser-mode tests for rendering/event fidelity (Playwright provider).
- Contract tests for adapters.
- Performance harness (synthetic 100k/500k points) with regression threshold.

### Why

- jsdom cannot validate WebGL/OffscreenCanvas behavior accurately.

---

## 8) Risks and Mitigations

### Risk: bundle size targets are too aggressive
Mitigation:

- Separate `capture` and `render` entrypoints.
- Hard CI budget checks per entrypoint.

### Risk: browser capability mismatch for worker rendering
Mitigation:

- Capability matrix + fallback tiers.
- Browser smoke tests in CI.

### Risk: privacy surprises in selectors/element metadata
Mitigation:

- Conservative defaults, explicit masking APIs, clear docs.

### Risk: API churn before adoption
Mitigation:

- Mark pre-1.0 unstable, maintain migration notes per release.

---

## 9) Sources Used For Refinement

- tsdown docs: https://tsdown.dev/
- tsdown feature gaps (migration page): https://tsdown.dev/guide/migrate-from-tsup
- tsdown CSS experimental status: https://tsdown.dev/options/css
- Rolldown beta status: https://github.com/rolldown/rolldown
- Vitest browser mode docs: https://vitest.dev/guide/browser/
- Vitest releases (latest line): https://github.com/vitest-dev/vitest
- Biome docs: https://biomejs.dev/
- TypeScript official blog (5.9 / 6.0 beta context): https://devblogs.microsoft.com/typescript/
- MDN PointerEvent pointerType: https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pointerType
- MDN visibilitychange guidance: https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event
- MDN sendBeacon: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon
- MDN fetch keepalive + 64KiB note: https://developer.mozilla.org/en-US/docs/Web/API/RequestInit
- MDN transferControlToOffscreen: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/transferControlToOffscreen
- Can I use OffscreenCanvas: https://caniuse.com/offscreencanvas
- MDN doNotTrack deprecation note: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/doNotTrack
- MDN Global Privacy Control: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/globalPrivacyControl
