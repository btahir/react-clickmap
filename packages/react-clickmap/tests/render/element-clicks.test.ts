import { describe, expect, it } from "vitest";
import { aggregateElementClicks } from "../../src/render/element-clicks";
import { createEvent } from "../fixtures";

describe("aggregateElementClicks", () => {
  it("aggregates click, rage-click, and dead-click counts by selector", () => {
    const summaries = aggregateElementClicks([
      createEvent({ selector: "#primary" }),
      createEvent({
        type: "rage-click",
        selector: "#primary",
        clusterSize: 4,
        windowMs: 500,
        radiusPx: 20,
      }),
      createEvent({
        type: "dead-click",
        selector: "#secondary",
        reason: "non-interactive-target",
      }),
      createEvent({ selector: "#primary" }),
    ]);

    expect(summaries).toHaveLength(2);
    expect(summaries[0]?.selector).toBe("#primary");
    expect(summaries[0]?.clicks).toBe(2);
    expect(summaries[0]?.rageClicks).toBe(1);
    expect(summaries[0]?.deadClicks).toBe(0);
    expect(summaries[0]?.total).toBe(3);
    expect(summaries[1]?.selector).toBe("#secondary");
    expect(summaries[1]?.deadClicks).toBe(1);
  });
});
