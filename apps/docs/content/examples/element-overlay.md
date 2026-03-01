# Example: Element Click Overlay

```tsx
import { Heatmap } from "react-clickmap";

<Heatmap
  adapter={adapter}
  type="clickmap"
  showElementClicks
  elementClickMinClicks={3}
  elementClickMaxBadges={12}
/>;
```

This mode overlays badges like `27 clicks` near visible matched elements.
