import { afterEach, describe, expect, it, vi } from "vitest";
import { createClickTracker } from "../../src/capture/click-tracker";

function dispatchPointerUp(target: Element, pointerType = "mouse"): void {
  const init = {
    bubbles: true,
    button: 0,
    clientX: 120,
    clientY: 240,
    pointerType,
  };

  if (typeof PointerEvent !== "undefined") {
    target.dispatchEvent(new PointerEvent("pointerup", init));
    return;
  }

  const fallbackEvent = new MouseEvent("pointerup", init);
  Object.defineProperty(fallbackEvent, "pointerType", { value: pointerType });
  target.dispatchEvent(fallbackEvent);
}

describe("createClickTracker", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("emits click and dead-click for non-interactive targets when enabled", () => {
    const emit = vi.fn();

    const cleanup = createClickTracker({
      projectId: "project-1",
      sessionId: "session-1",
      userId: "user-1",
      deviceType: "desktop",
      getPathname: () => "/pricing",
      getRouteKey: () => "/pricing",
      emit,
      enableDeadClicks: true,
      enableRageClicks: false,
    });

    const container = document.createElement("div");
    document.body.append(container);

    dispatchPointerUp(container);
    cleanup();

    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit.mock.calls[0]?.[0]?.type).toBe("click");
    expect(emit.mock.calls[1]?.[0]?.type).toBe("dead-click");
    expect(emit.mock.calls[1]?.[0]?.reason).toBe("non-interactive-target");
    expect(emit.mock.calls[0]?.[0]?.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("does not emit dead-click for interactive elements", () => {
    const emit = vi.fn();

    const cleanup = createClickTracker({
      projectId: "project-1",
      sessionId: "session-1",
      userId: undefined,
      deviceType: "desktop",
      getPathname: () => "/pricing",
      getRouteKey: () => "/pricing",
      emit,
      enableDeadClicks: true,
      enableRageClicks: false,
    });

    const button = document.createElement("button");
    button.textContent = "Open";
    document.body.append(button);

    dispatchPointerUp(button);
    cleanup();

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0]?.[0]?.type).toBe("click");
  });
});
