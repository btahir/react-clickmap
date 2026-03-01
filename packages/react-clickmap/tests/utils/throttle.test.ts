import { describe, expect, it, vi } from "vitest";
import { throttle } from "../../src/utils/throttle";

describe("throttle", () => {
  it("invokes trailing call with latest args", () => {
    vi.useFakeTimers();

    const callback = vi.fn<(value: number) => void>();
    const throttled = throttle(callback, 100);

    throttled(1);
    throttled(2);
    throttled(3);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenLastCalledWith(1);

    vi.advanceTimersByTime(101);

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith(3);

    vi.useRealTimers();
  });
});
