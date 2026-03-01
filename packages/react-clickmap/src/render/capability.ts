export type RenderCapabilityTier = "tier-1" | "tier-2" | "tier-3";

export interface RenderCapability {
  tier: RenderCapabilityTier;
  offscreenCanvas: boolean;
  worker: boolean;
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

export function detectRenderCapability(): RenderCapability {
  const offscreenCanvas = typeof OffscreenCanvas !== "undefined";
  const worker = typeof Worker !== "undefined";
  const webgl2 = supportsWebGL2();
  const webgl1 = supportsWebGL1();

  if (offscreenCanvas && worker && webgl2) {
    return {
      tier: "tier-1",
      offscreenCanvas,
      worker,
      webgl2,
      webgl1,
    };
  }

  if (offscreenCanvas && worker && webgl1) {
    return {
      tier: "tier-2",
      offscreenCanvas,
      worker,
      webgl2,
      webgl1,
    };
  }

  return {
    tier: "tier-3",
    offscreenCanvas,
    worker,
    webgl2,
    webgl1,
  };
}
