import { CanvasRenderer } from "./canvas-renderer";
import { detectRenderCapability } from "./capability";
import type { Renderer } from "./types";
import { WebGLRenderer } from "./webgl-renderer";

export interface RendererFactoryOptions {
  preferWebGL?: boolean;
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  options: RendererFactoryOptions = {},
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

export { detectRenderCapability } from "./capability";
export { DEFAULT_GRADIENT } from "./gradient";
export type { GradientMap, Renderer, RenderOptions, RenderPoint } from "./types";
