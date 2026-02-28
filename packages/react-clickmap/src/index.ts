export { createAdapter, fetchAdapter, localStorageAdapter, memoryAdapter } from './adapters';
export { Heatmap } from './heatmap';
export { HeatmapThumbnail } from './heatmap-thumbnail';
export { ClickmapProvider } from './provider';
export { DEFAULT_GRADIENT, detectRenderCapability } from './render';
export { ScrollDepth } from './scroll-depth';
export { useClickmap } from './use-clickmap';
export { useHeatmapData } from './use-heatmap-data';

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

export type { DateRangeInput, HeatmapProps, HeatmapType } from './heatmap';
export type { HeatmapThumbnailProps } from './heatmap-thumbnail';
export type { ScrollDepthProps } from './scroll-depth';
export type { RenderCapability, RenderCapabilityTier } from './render/capability';
export type { GradientMap, HeatmapRenderMode, RenderPoint } from './render/types';
