# react-clickmap-cli

Local self-hosted preview API and dashboard for `react-clickmap`.

## Install

```bash
pnpm add -D react-clickmap-cli
```

Or run without installing:

```bash
npx react-clickmap-cli
```

## Start local preview

```bash
react-clickmap --port 3334
```

This starts:

- Dashboard: `http://127.0.0.1:3334`
- Ingest API: `http://127.0.0.1:3334/api/clickmap`
- Local data file: `.react-clickmap/events.json`

## CLI options

```bash
react-clickmap --host 0.0.0.0 --port 3334 --data ./tmp/clickmap-events.json
```

- `--host`: bind host (default `127.0.0.1`)
- `--port`: bind port (default `3334`)
- `--data`: path to JSON event store

## React adapter wiring

```ts
import { createNextFetchAdapter } from "@react-clickmap/next";

const adapter = createNextFetchAdapter({
  endpoint: "http://127.0.0.1:3334/api/clickmap",
});
```

Now your app sends events to the local preview dashboard.
