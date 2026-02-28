import { describe, expect, it } from 'vitest';
import { toRenderPoints, summarizeScrollDepth } from '../../src/render/normalize';
import { createEvent } from '../fixtures';

describe('render normalization', () => {
  it('aggregates points by coordinate and normalizes weight', () => {
    const points = toRenderPoints([
      createEvent({ x: 10.04, y: 20.02 }),
      createEvent({ x: 10.04, y: 20.02 }),
      createEvent({ x: 80.1, y: 70.3 })
    ]);

    expect(points).toHaveLength(2);
    expect(points.some((point) => point.weight === 1)).toBe(true);
  });

  it('summarizes scroll depth as ratios', () => {
    const summary = summarizeScrollDepth([
      createEvent({
        type: 'scroll',
        depth: 40,
        maxDepth: 70
      }),
      createEvent({
        type: 'scroll',
        depth: 60,
        maxDepth: 90
      })
    ]);

    expect(summary.length).toBe(10);
    const ratioTotal = summary.reduce((sum, item) => sum + item.ratio, 0);
    expect(Math.round(ratioTotal * 1000) / 1000).toBe(1);
  });
});
