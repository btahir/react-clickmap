export type HeatmapRenderMode = 'heatmap' | 'clickmap';

export interface RenderPoint {
  x: number;
  y: number;
  weight: number;
}

export type GradientMap = Record<number, string>;

export interface RenderOptions {
  width: number;
  height: number;
  opacity: number;
  radius: number;
  gradient: GradientMap;
  mode: HeatmapRenderMode;
}

export interface Renderer {
  resize(width: number, height: number): void;
  render(points: RenderPoint[], options: RenderOptions): void;
  clear(): void;
  dispose(): void;
}
