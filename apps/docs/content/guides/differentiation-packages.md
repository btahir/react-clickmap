# Differentiation Packages

`react-clickmap` now ships first-party add-ons beyond the core capture/render library.

## `@react-clickmap/next`

Next.js integration helpers:

- `createNextFetchAdapter` for `/api/clickmap` defaults
- `createClickmapRouteHandlers` for `GET/POST/DELETE/OPTIONS`
- `useNextRouteKey` for `pathname + search` route keys

## `@react-clickmap/dashboard`

Batteries-included analytics UI:

- KPI cards
- event/device distribution panels
- top pages and element hotspot summaries
- hourly activity bars
- overlay toggles for `Heatmap`, `ComparisonHeatmap`, `AttentionHeatmap`, and `ScrollDepth`

## `react-clickmap-cli`

Local preview mode for development:

- self-hosted API at `/api/clickmap`
- browser dashboard with live event metrics + canvas heatmap
- file-backed storage for local event replay

Example:

```bash
npx react-clickmap-cli --port 3334
```
