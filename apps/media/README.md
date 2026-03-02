# @react-clickmap/media

Remotion-based product media pipeline for `react-clickmap`.

## Outputs

Running the render scripts writes media directly to the root `assets/` folder:

- `assets/readme-hero.gif`
- `assets/readme-hero-poster.png`
- `assets/launch-video.mp4`
- `assets/launch-thumbnail.png`
- `assets/feature-showcase.png`

## Commands

```bash
pnpm --filter @react-clickmap/media run dev
pnpm --filter @react-clickmap/media run render:all
```

Individual renders:

```bash
pnpm --filter @react-clickmap/media run render:hero:gif
pnpm --filter @react-clickmap/media run render:hero:poster
pnpm --filter @react-clickmap/media run render:launch
pnpm --filter @react-clickmap/media run render:launch:thumb
pnpm --filter @react-clickmap/media run render:feature
```

## Brand system

All compositions follow the docs-site palette and typography direction:

- Primary: `#5eead4`
- Secondary: `#60a5fa`
- Base background: `#050915`
- Font stack: `Sora`, `Avenir Next`, fallback sans-serif
