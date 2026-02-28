import type { GradientMap } from './types';

export const DEFAULT_GRADIENT: GradientMap = {
  0.0: '#0000ff',
  0.4: '#00ff00',
  0.7: '#ffff00',
  1.0: '#ff0000'
};

export function normalizeGradientStops(gradient: GradientMap): Array<[number, string]> {
  return Object.entries(gradient)
    .map(([stop, color]) => [Number(stop), color] as [number, string])
    .filter(([stop]) => Number.isFinite(stop) && stop >= 0 && stop <= 1)
    .sort((a, b) => a[0] - b[0]);
}

export function buildGradientPalette(gradient: GradientMap): Uint8ClampedArray {
  if (typeof document === 'undefined') {
    return new Uint8ClampedArray(256 * 4);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1;

  const context = canvas.getContext('2d');
  if (!context) {
    return new Uint8ClampedArray(256 * 4);
  }

  const normalized = normalizeGradientStops(gradient);
  const colorGradient = context.createLinearGradient(0, 0, 256, 0);

  for (const [stop, color] of normalized) {
    colorGradient.addColorStop(stop, color);
  }

  context.fillStyle = colorGradient;
  context.fillRect(0, 0, 256, 1);

  return context.getImageData(0, 0, 256, 1).data;
}

export function paletteColorAt(
  palette: Uint8ClampedArray,
  ratio: number
): { r: number; g: number; b: number } {
  const clamped = Math.max(0, Math.min(1, ratio));
  const index = Math.min(255, Math.floor(clamped * 255));
  const offset = index * 4;

  return {
    r: palette[offset] ?? 0,
    g: palette[offset + 1] ?? 0,
    b: palette[offset + 2] ?? 0
  };
}
