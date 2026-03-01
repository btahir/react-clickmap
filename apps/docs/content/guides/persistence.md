# Persistence Guide

## Available adapter paths

- In-memory: `memoryAdapter`
- Browser local storage: `localStorageAdapter`
- HTTP transport: `fetchAdapter`
- Postgres add-on: `react-clickmap-postgres`
- Supabase add-on: `react-clickmap-supabase`

## SQL-first canonical model

Core event identity fields:

- `eventId`
- `projectId`
- `sessionId`
- optional `userId`

Use `deleteEvents` for scoped data deletion workflows.

## Retention guidance

Recommended defaults:

- Raw event retention: 30 to 90 days
- Daily aggregates: 12 to 18 months
- Session metadata: 30 to 90 days

Apply retention at the storage layer (SQL cron/job policy) to keep the runtime package simple.

## Deletion flow example

Use adapter-level scoped delete operations for compliance requests:

```ts
await adapter.deleteEvents?.({
  projectId: "acme-web",
  userId: "user-123",
});
```

For SQL backends, keep `projectId` mandatory in deletes to avoid broad accidental wipes.
