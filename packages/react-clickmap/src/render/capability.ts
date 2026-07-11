export interface RenderCapability {
  webgl2: boolean;
  webgl1: boolean;
}

function supportsWebGL2(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  const canvas = document.createElement("canvas");
  return canvas.getContext("webgl2") !== null;
}

function supportsWebGL1(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  const canvas = document.createElement("canvas");
  return canvas.getContext("webgl") !== null;
}

/**
 * Reports whether WebGL2/WebGL1 rendering contexts are available. This is
 * the only capability signal `createRenderer` actually acts on -- it picks
 * WebGL when available and falls back to Canvas2D otherwise (`WebGLRenderer`
 * itself further prefers WebGL2 over WebGL1 internally).
 */
export function detectRenderCapability(): RenderCapability {
  return {
    webgl2: supportsWebGL2(),
    webgl1: supportsWebGL1(),
  };
}
