# Components API

## `ClickmapProvider`

Key props:

- `adapter`
- `projectId`
- `userId`
- `capture`
- privacy/consent controls

## `Heatmap`

Key props:

- query filters (`page`, `routeKey`, `dateRange`, `device`)
- render controls (`type`, `radius`, `opacity`, `gradient`)
- overlay options (`showElementClicks`, badge thresholds)

Imperative handle (`ref`):

- `toDataUrl()`
- `toBlob()`
- `download()`

## `ElementClickOverlay`

Shows click-count badges anchored to visible elements using selector-derived aggregation.

## `ComparisonHeatmap`

Renders before/after range overlays in a single view:

- `beforeDateRange`
- `afterDateRange`
- shared filters (`page`, `routeKey`, `device`)

## `AttentionHeatmap`

Combines interaction events and scroll profile to render weighted attention zones:

- includes pointer movement, clicks, rage clicks, and dead clicks
- boosts weights using scroll-depth profile

## `HeatmapThumbnail`

Embeddable static-size heatmap renderer for compact previews and lists.

## `ScrollDepth`

Right-edge depth rail showing how far users get on the page.
