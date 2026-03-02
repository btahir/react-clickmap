# Example: Export Heatmap Image

The `<Heatmap>` component exposes an imperative handle via React ref that lets you export the rendered canvas as an image. Use this to build "Download as PNG" buttons, generate thumbnails, or pipe heatmap images into reports.

## Download with one click

```tsx
import { useRef } from "react";
import { Heatmap, type HeatmapHandle } from "react-clickmap";

function HeatmapWithExport({ adapter }) {
  const ref = useRef<HeatmapHandle>(null);

  return (
    <div>
      <button onClick={() => ref.current?.download("pricing-heatmap.png")}>
        Download PNG
      </button>

      <Heatmap
        ref={ref}
        adapter={adapter}
        page="/pricing"
        type="heatmap"
      />
    </div>
  );
}
```

Clicking the button triggers a browser download of the current heatmap canvas as `pricing-heatmap.png`.

## HeatmapHandle methods

All three methods are available on the ref:

### `toDataUrl(type?, quality?)`

Returns the canvas contents as a base64-encoded data URL string, or `null` if the canvas isn't available.

```ts
const dataUrl = ref.current?.toDataUrl();
// "data:image/png;base64,iVBORw0KGgo..."

// JPEG at 80% quality
const jpegUrl = ref.current?.toDataUrl("image/jpeg", 0.8);
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `type` | `string` | `"image/png"` | MIME type for the exported image |
| `quality` | `number` | `0.92` | Quality for lossy formats (0–1) |

### `toBlob(type?, quality?)`

Returns a `Promise<Blob | null>`. Prefers the native `canvas.toBlob()` API when available, falling back to a data URL conversion.

```ts
const blob = await ref.current?.toBlob();
if (blob) {
  // Upload to your server
  const formData = new FormData();
  formData.append("heatmap", blob, "heatmap.png");
  await fetch("/api/upload", { method: "POST", body: formData });
}
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `type` | `string` | `"image/png"` | MIME type for the exported image |
| `quality` | `number` | `0.92` | Quality for lossy formats (0–1) |

### `download(filename?, type?, quality?)`

Downloads the heatmap as a file. Creates a temporary object URL, triggers a click on a hidden `<a>` element, then cleans up. Returns `true` on success, `false` if the canvas isn't available or blob creation fails.

```ts
const success = await ref.current?.download("report-heatmap.png");
if (!success) {
  console.warn("Export failed — canvas not ready");
}
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `filename` | `string` | `"react-clickmap-export.png"` | The downloaded file name |
| `type` | `string` | `"image/png"` | MIME type for the exported image |
| `quality` | `number` | `0.92` | Quality for lossy formats (0–1) |

## Export as JPEG

For smaller file sizes (especially on large canvases), export as JPEG:

```ts
await ref.current?.download("heatmap.jpg", "image/jpeg", 0.85);
```

Note: JPEG does not support transparency. The heatmap overlay will render against a black background rather than a transparent one.

## Generate a thumbnail

Use `toBlob()` to create a thumbnail preview without triggering a download:

```tsx
import { useRef, useState } from "react";
import { Heatmap, type HeatmapHandle } from "react-clickmap";

function HeatmapPreview({ adapter }) {
  const ref = useRef<HeatmapHandle>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  async function generateThumbnail() {
    const blob = await ref.current?.toBlob();
    if (blob) {
      setThumbnail(URL.createObjectURL(blob));
    }
  }

  return (
    <div>
      <Heatmap ref={ref} adapter={adapter} page="/pricing" type="heatmap" />

      <button onClick={generateThumbnail}>Generate Preview</button>

      {thumbnail && (
        <img
          src={thumbnail}
          alt="Heatmap preview"
          style={{ width: 300, border: "1px solid #ccc" }}
        />
      )}
    </div>
  );
}
```

## Upload to a server

Combine `toBlob()` with a fetch call to save heatmap snapshots server-side:

```ts
async function uploadHeatmap(ref: React.RefObject<HeatmapHandle | null>, page: string) {
  const blob = await ref.current?.toBlob();
  if (!blob) return;

  const formData = new FormData();
  formData.append("image", blob, `${page}-heatmap.png`);
  formData.append("page", page);
  formData.append("exportedAt", new Date().toISOString());

  await fetch("/api/heatmap-snapshots", {
    method: "POST",
    body: formData,
  });
}
```

## Tips

- **Wait for data** — The canvas is empty until `adapter.load()` resolves and the renderer draws. If you call `toDataUrl()` before data loads, you'll get a blank image. Use the `useHeatmapData` hook's loading state to gate your export button.
- **Canvas size** — The exported image matches the canvas dimensions, which are the full viewport size. For a specific resolution, you could resize the canvas container before exporting.
- **Cross-origin** — If your page includes cross-origin images or iframes, the canvas may be tainted and `toDataUrl()` / `toBlob()` will return `null`. This is a browser security restriction, not a react-clickmap limitation.
