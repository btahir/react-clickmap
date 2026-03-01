import { describe, expect, it, vi } from "vitest";
import { EventBatcher } from "../../src/capture/batcher";
import { createEvent } from "../fixtures";

describe("EventBatcher", () => {
  it("flushes pending events queued during an in-flight flush", async () => {
    let resolveFirst: (() => void) | undefined;
    let firstCall = true;

    const save = vi.fn((_events: ReturnType<typeof createEvent>[]) => {
      if (firstCall) {
        firstCall = false;
        return new Promise<void>((resolve) => {
          resolveFirst = resolve;
        });
      }

      return Promise.resolve();
    });

    const batcher = new EventBatcher({
      adapter: {
        save,
        load: async () => [],
      },
      flushIntervalMs: 5_000,
      maxBatchSize: 50,
    });

    batcher.push(createEvent({ timestamp: 1_000 }));

    const firstFlush = batcher.flush("manual");

    batcher.push(createEvent({ timestamp: 2_000 }));
    const secondFlush = batcher.flush("pagehide");

    expect(save).toHaveBeenCalledTimes(1);
    resolveFirst?.();

    await Promise.all([firstFlush, secondFlush]);

    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[0]?.[0]).toHaveLength(1);
    expect(save.mock.calls[1]?.[0]).toHaveLength(1);
    expect(save.mock.calls[1]?.[0]?.[0]?.timestamp).toBe(2_000);
  });

  it("drains queued events best-effort on pagehide while a flush is in-flight", async () => {
    let resolveInFlight: (() => void) | undefined;
    let firstCall = true;

    const save = vi.fn((_events: ReturnType<typeof createEvent>[]) => {
      if (firstCall) {
        firstCall = false;
        return new Promise<void>((resolve) => {
          resolveInFlight = resolve;
        });
      }

      return Promise.resolve();
    });

    const batcher = new EventBatcher({
      adapter: {
        save,
        load: async () => [],
      },
      flushIntervalMs: 5_000,
      maxBatchSize: 50,
    });

    batcher.start();
    batcher.push(createEvent({ timestamp: 1_000 }));

    const inFlightFlush = batcher.flush("manual");

    batcher.push(createEvent({ timestamp: 2_000 }));
    window.dispatchEvent(new Event("pagehide"));

    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1]?.[0]?.[0]?.timestamp).toBe(2_000);

    resolveInFlight?.();
    await inFlightFlush;
    batcher.stop();
  });
});
