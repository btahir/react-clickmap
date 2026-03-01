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
