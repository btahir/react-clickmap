# Clickmap Studio

A developer installs capture and authorizes analytics access. Designers and developers inspect the same app and export the same evidence.

## Install and render

```tsx
'use client';
import {ClickmapStudio} from '@react-clickmap/dashboard';
// adapter must use an endpoint authorized for the current administrator.
export function Inspector({adapter}) {
  return <ClickmapStudio adapter={adapter} projectId="my-app" layoutId="pricing-v2" />;
}
```

Keep the inspector separate from capture. `data-clickmap-studio` and `data-clickmap-ignore` subtrees are excluded from collection. Use a lazily loaded admin route in production. Hiding this component is not server authorization.

## Workflow

1. Start capture with the required consent. Interact with the app and wait for the configured flush interval.
2. Studio shows the first received event and a raw payload preview. Missing events? Check enabled state, consent, DNT/GPC, and endpoint access.
3. Filter page, device, layout revision, time, and viewport width. The query describes the data used for metrics and overlays.
4. Select an element label to locate it on the actual page. Use stable, non-sensitive `data-clickmap-id` names.
5. Show the heatmap only on a matching page and compatible revision/viewport. An exported PNG contains the overlay, not a screenshot of the application.
6. Export JSON evidence, Markdown findings, or a CSV element table. Inspect your app's target/path names before sharing.

Evidence imports remain local and do not write back to the adapter. The inspector caps loaded event records; bounded sets are labeled. `completeness="complete"` is appropriate only when your source guarantees it. Default is bounded. Small samples and heuristic limits remain visible. Report numbers do not prove causation or conversion lift.

## Architecture

React core is the collector/rendering layer. Studio lives in the dashboard package. Pure contracts have no React or DOM imports and can run in a terminal. Every evidence bundle names its schema version, source, original cohort, completeness and creation time. CLI and Studio share the report implementation. No hosted model, API key, or account service is required.
