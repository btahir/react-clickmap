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
