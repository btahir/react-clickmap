# Contributing

Thanks for contributing to react-clickmap.

## Setup

1. Install pnpm.
2. Run `pnpm install`.
3. Run `pnpm check && pnpm test:run && pnpm build`.

## Architecture Overview

- Capture runtime: `packages/react-clickmap/src/capture`
- Adapters (storage/transport): `packages/react-clickmap/src/adapters`
- Renderers (WebGL/Canvas): `packages/react-clickmap/src/render`
- React integration: `packages/react-clickmap/src/provider.tsx`, hooks/components in `src/`

## Code Style

- Biome is the source of truth for linting/formatting.
- Keep changes small and scoped to one concern per commit.
- Preserve public API stability unless a deliberate breaking change is documented.

## Testing Requirements

- Add or update tests for behavior changes.
- Minimum local validation before PR:
  - `pnpm check`
  - `pnpm test:run`
  - `pnpm build`

## Pull Requests

- Keep commits focused and atomic.
- Add tests for behavior changes.
- Include a changeset for publishable package changes.
