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

/**
 * Convert a viewport-relative pointer position into document-relative
 * percentages against the full scrollable document size. Returns `undefined`
 * when the document has no measurable size (e.g. in non-DOM environments), so
 * callers can leave the additive doc fields unset.
 */
export function toDocumentPercentages(
  clientX: number,
  clientY: number,
  scrollX: number,
  scrollY: number,
  scrollWidth: number,
  scrollHeight: number,
): { x: number; y: number } | undefined {
  if (scrollWidth <= 0 || scrollHeight <= 0) {
    return undefined;
  }

  return toViewportPercentages(clientX + scrollX, clientY + scrollY, scrollWidth, scrollHeight);
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
