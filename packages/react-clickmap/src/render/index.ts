import { detectRenderCapability } from './capability';
import { CanvasRenderer } from './canvas-renderer';
import { WebGLRenderer } from './webgl-renderer';
import type { Renderer } from './types';

export interface RendererFactoryOptions {
  preferWebGL?: boolean;
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  options: RendererFactoryOptions = {}
): Renderer {
  const capability = detectRenderCapability();
  const shouldUseWebgl = options.preferWebGL ?? capability.webgl1;

  if (shouldUseWebgl) {
    try {
      return new WebGLRenderer(canvas);
    } catch {
      // fallback to canvas renderer
    }
  }

  return new CanvasRenderer(canvas);
}

export { DEFAULT_GRADIENT } from './gradient';
export { detectRenderCapability } from './capability';
export type { GradientMap, RenderOptions, RenderPoint, Renderer } from './types';
