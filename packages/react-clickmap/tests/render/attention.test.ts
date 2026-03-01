import { describe, expect, it } from "vitest";
import { toAttentionRenderPoints } from "../../src/render/attention";
import { createEvent } from "../fixtures";

describe("toAttentionRenderPoints", () => {
  it("combines movement/click events with scroll profile boosts", () => {
    const points = toAttentionRenderPoints([
      createEvent({ type: "scroll", depth: 40, maxDepth: 70 }),
      createEvent({ type: "pointer-move", x: 25, y: 40 }),
      createEvent({ type: "click", x: 25, y: 40 }),
      createEvent({
        type: "rage-click",
        x: 78,
        y: 15,
        clusterSize: 4,
        windowMs: 500,
        radiusPx: 30,
      }),
    ]);

    expect(points.length).toBeGreaterThan(0);
    expect(points.some((point) => point.weight > 0)).toBe(true);
    expect(points.every((point) => point.weight <= 1)).toBe(true);
  });
});
