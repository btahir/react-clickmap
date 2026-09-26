import { describe, expect, it } from "vitest";
import { summarizeScrollDepth, toRenderPoints } from "../../src/render/normalize";
import { createEvent } from "../fixtures";

describe("render normalization", () => {
  it("aggregates points by coordinate and normalizes weight", () => {
    const points = toRenderPoints([
      createEvent({ x: 10.04, y: 20.02 }),
      createEvent({ x: 10.04, y: 20.02 }),
      createEvent({ x: 80.1, y: 70.3 }),
    ]);

    expect(points).toHaveLength(2);
    expect(points.some((point) => point.weight === 1)).toBe(true);
  });

  it("uses document coordinates in document mode", () => {
    const points = toRenderPoints(
      [
        createEvent({ x: 50, y: 50, docX: 10, docY: 90 }),
        createEvent({ x: 50, y: 50, docX: 10, docY: 90 }),
      ],
      "document",
    );

    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({ x: 10, y: 90 });
  });

  it("skips events without document coordinates in document mode", () => {
    const points = toRenderPoints(
      [
        createEvent({ x: 50, y: 50 }), // no docX/docY -> skipped
        createEvent({ x: 20, y: 20, docX: 30, docY: 40 }),
      ],
      "document",
    );

    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({ x: 30, y: 40 });
  });

  it("summarizes scroll depth as ratios", () => {
    const summary = summarizeScrollDepth([
      createEvent({
        type: "scroll",
        depth: 40,
        maxDepth: 70,
      }),
      createEvent({
        type: "scroll",
        depth: 60,
        maxDepth: 90,
      }),
    ]);

    expect(summary.length).toBe(10);
    expect(summary.find((b) => b.depth === 90)?.ratio).toBe(1);
    expect(summary.find((b) => b.depth === 100)?.ratio).toBe(0);
  });
});
