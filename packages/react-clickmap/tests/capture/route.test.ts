import { afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentRouteKey, subscribeRouteChanges } from "../../src/capture/route";

describe("route tracking", () => {
  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("notifies listeners on pushState and popstate transitions", () => {
    const onChange = vi.fn(() => getCurrentRouteKey());
    const unsubscribe = subscribeRouteChanges(onChange);

    window.history.pushState({}, "", "/pricing?plan=pro");
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(getCurrentRouteKey()).toBe("/pricing?plan=pro");

    unsubscribe();
  });

  it("restores native history methods when the last listener unsubscribes", () => {
    const originalPushState = window.history.pushState;
    const unsubscribe = subscribeRouteChanges(() => {});

    expect(window.history.pushState).not.toBe(originalPushState);

    unsubscribe();

    expect(window.history.pushState).toBe(originalPushState);
  });
});
