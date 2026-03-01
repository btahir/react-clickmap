export function clamp(input: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, input));
}

export function toViewportPercentages(
  clientX: number,
  clientY: number,
  width: number,
  height: number,
): { x: number; y: number } {
  if (width <= 0 || height <= 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: clamp((clientX / width) * 100, 0, 100),
    y: clamp((clientY / height) * 100, 0, 100),
  };
}

export function fromViewportPercentages(
  x: number,
  y: number,
  width: number,
  height: number,
): { x: number; y: number } {
  return {
    x: (clamp(x, 0, 100) / 100) * width,
    y: (clamp(y, 0, 100) / 100) * height,
  };
}
