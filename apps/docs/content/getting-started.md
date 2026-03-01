# Getting Started

## Install

```bash
pnpm add react-clickmap
```

## Basic setup

```tsx
import { ClickmapProvider, Heatmap, fetchAdapter } from "react-clickmap";

const adapter = fetchAdapter({ endpoint: "/api/clickmap" });

export function App() {
  return (
    <ClickmapProvider adapter={adapter} projectId="acme-web">
      <YourApp />
      <Heatmap adapter={adapter} page="/pricing" type="heatmap" />
    </ClickmapProvider>
  );
}
```

## Capture modes

- `click`
- `dead-click`
- `rage-click`
- `scroll`
- `pointer-move`

## Production defaults

- Set `projectId` explicitly.
- Use consent gates where required.
- Use `fetchAdapter` or a server-side adapter package for persistence.
