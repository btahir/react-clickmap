# Example: Element Click Overlay

The `ElementClickOverlay` renders floating badges on top of your page's elements showing how many times each one was clicked. It's useful for quickly spotting which buttons, links, and interactive elements get the most attention — and which ones trigger rage or dead clicks.

## Basic usage

Pass `showElementClicks` to the `<Heatmap>` component:

```tsx
import { Heatmap } from "react-clickmap";

function ClickOverlay() {
  return (
    <Heatmap
      adapter={adapter}
      page="/pricing"
      type="clickmap"
      showElementClicks
    />
  );
}
```

This renders a fixed overlay with a badge near each visible element that has at least 1 click. Badges show the total click count (e.g., `27 clicks`) and a tooltip with the breakdown.

## Configuring badge limits

Control how many badges appear and the minimum click threshold:

```tsx
<Heatmap
  adapter={adapter}
  page="/pricing"
  type="clickmap"
  showElementClicks
  elementClickMinClicks={5}   // only show elements with 5+ clicks
  elementClickMaxBadges={10}  // show at most 10 badges
/>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `showElementClicks` | `boolean` | `false` | Enable the overlay |
| `elementClickMinClicks` | `number` | `1` | Minimum click count for an element to get a badge |
| `elementClickMaxBadges` | `number` | `20` | Maximum number of badges rendered at once |

Badges are sorted by total clicks (highest first), so if you set `maxBadges={10}`, the 10 most-clicked elements are shown.

## Standalone usage

You can also use `ElementClickOverlay` directly if you want to manage the event data yourself:

```tsx
import { ElementClickOverlay } from "react-clickmap";
import { useHeatmapData } from "react-clickmap";

function MyOverlay({ adapter }) {
  const { data } = useHeatmapData(adapter, { page: "/pricing" });

  return (
    <ElementClickOverlay
      events={data}
      maxBadges={15}
      minClicks={3}
      zIndex={10000}
    />
  );
}
```

### ElementClickOverlay props

| Prop | Type | Default | Description |
|---|---|---|---|
| `events` | `CaptureEvent[]` | — | Array of captured events to aggregate |
| `maxBadges` | `number` | `20` | Maximum badges to display |
| `minClicks` | `number` | `1` | Minimum total clicks for a badge to appear |
| `zIndex` | `number` | `10000` | CSS z-index of the overlay container |
| `className` | `string` | — | Optional CSS class on the overlay container |

## How it works

1. **Aggregation** — `aggregateElementClicks(events)` groups click, rage-click, and dead-click events by their `selector` field. Events without a selector are skipped. The result is an array of `ElementClickSummary` objects sorted by total count (descending).

2. **Visibility check** — For each summary, the overlay calls `document.querySelector(selector)` and checks that the element exists, has non-zero dimensions, and is within the viewport. Off-screen elements get no badge.

3. **Positioning** — Badges are placed at the top-left corner of each element's bounding rect using `position: fixed`. They update automatically on scroll and window resize.

4. **Styling** — Each badge is a dark pill with a monospace font, showing the total click count. Hover the badge to see a tooltip with the full breakdown: `27 clicks | rage: 3 | dead: 2`.

## ElementClickSummary

The aggregation function returns this shape:

```ts
interface ElementClickSummary {
  selector: string;    // CSS selector of the element
  clicks: number;      // regular click count
  rageClicks: number;  // rage-click count
  deadClicks: number;  // dead-click count
  total: number;       // sum of all three
}
```

## Tips

- **Combine with heatmap** — Use `type="clickmap"` alongside `showElementClicks` to see both individual dots and element-level badges at the same time.
- **Filter by date** — Add a `dateRange` prop to the `<Heatmap>` to scope the overlay to recent events.
- **Selector quality** — Badge accuracy depends on the CSS selectors captured with each event. If your elements have stable `id` or `data-*` attributes, the overlay will match more reliably.
- **Performance** — With many elements visible on screen, badge positioning runs on scroll and resize. The `maxBadges` cap prevents rendering too many DOM nodes.
