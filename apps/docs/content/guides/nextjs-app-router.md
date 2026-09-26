# Next.js App Router Integration

Keep collection, inspection, and database access separate. Server credentials never belong in a client bundle.

## Install

```sh
npm install react-clickmap @react-clickmap/next @react-clickmap/postgres pg
```

Apply `POSTGRES_INIT_SQL` once during a controlled migration. Production uses your existing authentication, authorization and rate-limiting infrastructure.

```ts
// app/api/clickmap/route.ts
import {createClickmapRouteHandlers} from '@react-clickmap/next/server';
import {createPostgresAdapter} from '@react-clickmap/postgres';
import {Pool} from 'pg';
import {isAuthorizedAnalyticsAdmin,allowIngest} from '@/lib/your-auth';

const pool = new Pool({connectionString:process.env.DATABASE_URL});
const adapter = createPostgresAdapter({sql:pool});
export const {GET,POST,DELETE,OPTIONS} = createClickmapRouteHandlers(adapter, {
  projectId:'my-app',
  authorize: async (request,operation) => isAuthorizedAnalyticsAdmin(request,operation),
  authorizeIngest: request => allowIngest(request),
  allowedOrigins:['https://your-app.example'],
  maxBodyBytes:262144,
  maxBatchSize:500,
  maxReadEvents:10000,
});
```

`your-auth` above is an application integration point, not a provided authentication implementation. A complete runnable local example is in `apps/self-hosted`: it uses an administrator token held only in memory, an explicit local-origin allowlist, Postgres, and an app-embedded inspector. Put it behind HTTPS and your organization's auth before exposing it externally.

Project scope is assigned by the server; mismatching client projects are rejected. GET/DELETE fail closed when `authorize` is absent. POST is intended for bounded ingestion and can use `authorizeIngest` for rate limits or application access. Origin checks are not bot protection or authorization. DELETE requires a narrower page/session/date filter; avoid accidental whole-project removal.

## Client capture

```tsx
'use client';
import {ClickmapProvider,fetchAdapter} from 'react-clickmap';
const adapter=fetchAdapter({endpoint:'/api/clickmap'});
export function Capture({children,consent}){
  return <ClickmapProvider adapter={adapter} projectId="my-app" layoutId="v1" consentRequired hasConsent={consent}>{children}</ClickmapProvider>;
}
```

Capture-only clients need no analytics read token. Administrator Studio uses a separately authorized fetch adapter. Use `@react-clickmap/next/client` for `useNextRouteKey`; its default now excludes search parameters. Pure server imports must use `/server` to avoid pulling React hooks into RSC server graphs.
