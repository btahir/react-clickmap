# Adapters API

## `ClickmapAdapter`

```ts
interface ClickmapAdapter {
  save(events: CaptureEvent[]): Promise<void>;
  load(query: HeatmapQuery): Promise<CaptureEvent[]>;
  deleteEvents?(query: HeatmapQuery): Promise<number>;
  loadAggregated?(query: HeatmapQuery): Promise<AggregatedHeatmapPayload>;
}
```

## Built-ins

- `memoryAdapter`
- `localStorageAdapter`
- `fetchAdapter`

## Add-ons

- `react-clickmap-postgres`
- `react-clickmap-supabase`
