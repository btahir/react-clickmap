export { ClickmapProvider } from './provider';
export { useClickmap } from './use-clickmap';
export { useHeatmapData } from './use-heatmap-data';
export { createAdapter, fetchAdapter, localStorageAdapter, memoryAdapter } from './adapters';
export type {
  AggregatedBin,
  AggregatedHeatmapPayload,
  CaptureEvent,
  CaptureType,
  ClickmapAdapter,
  DeviceType,
  HeatmapQuery,
  PointerType
} from './types';
