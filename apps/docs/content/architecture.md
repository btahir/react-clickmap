# Architecture Overview

## Capture pipeline

1. Browser listeners collect interaction events.
2. Events are normalized and queued.
3. Batcher flushes by size/interval/visibility/pagehide.
4. Adapter persists to selected backend.

## Render pipeline

1. Events are loaded by query.
2. Normalization creates weighted render points.
3. Renderer draws in WebGL or Canvas mode.
4. Optional element overlay shows per-selector click counts.

## Persistence model

Canonical model is SQL-first with Postgres reference implementation and adapter extensibility for other systems.
