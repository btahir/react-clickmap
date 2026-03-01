# Example: Export Heatmap Image

```tsx
import { useRef } from "react";
import { Heatmap, type HeatmapHandle } from "react-clickmap";

const ref = useRef<HeatmapHandle>(null);

async function exportImage() {
  await ref.current?.download("pricing-heatmap.png");
}

<Heatmap ref={ref} adapter={adapter} page="/pricing" />;
```

Available methods:

- `toDataUrl()`
- `toBlob()`
- `download()`
