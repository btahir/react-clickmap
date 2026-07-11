import { afterEach, describe, expect, it, vi } from "vitest";
import { createCaptureEngine } from "../../src/capture/engine";
import type { CaptureEvent, CaptureType, ClickmapAdapter } from "../../src/types";

function dispatchPointerUp(target: Element, clientX = 50, clientY = 50): void {
  const init = {
    bubbles: true,
    button: 0,
    clientX,
    clientY,
    pointerType: "mouse",
  };

  if (typeof PointerEvent !== "undefined") {
    target.dispatchEvent(new PointerEvent("pointerup", init));
    return;
  }

  const fallbackEvent = new MouseEvent("pointerup", init);
  Object.defineProperty(fallbackEvent, "pointerType", { value: "mouse" });
  target.dispatchEvent(fallbackEvent);
}

function createRecordingAdapter(): ClickmapAdapter & { saved: CaptureEvent[][] } {
  const saved: CaptureEvent[][] = [];
  return {
    saved,
    async save(events: CaptureEvent[]) {
      saved.push(events);
    },
    async load() {
      return [];
    },
  };
}

function baseEngineOptions(
  adapter: ClickmapAdapter,
  capture: CaptureType[],
): Parameters<typeof createCaptureEngine>[0] {
  return {
    adapter,
    capture,
    projectId: "proj-1",
    sessionId: "sess-1",
    userId: undefined,
    flushIntervalMs: 5_000,
    maxBatchSize: 1,
    sampleRate: 1,
    enabled: true,
    consentRequired: false,
    hasConsent: true,
    respectDoNotTrack: false,
    respectGlobalPrivacyControl: false,
    ignoreSelectors: [],
    maskSelectors: [],
  };
}

describe("createCaptureEngine capture-type gating", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("registers the click tracker and stores only dead-click events for capture=['dead-click']", async () => {
    const adapter = createRecordingAdapter();
    const engine = createCaptureEngine(baseEngineOptions(adapter, ["dead-click"]));

    expect(engine.start()).toBe(true);

    const container = document.createElement("div");
    document.body.append(container);
    dispatchPointerUp(container);

    await vi.waitFor(() => {
      expect(adapter.saved.flat().length).toBeGreaterThan(0);
    });

    engine.stop();

    const types = adapter.saved.flat().map((event) => event.type);
    expect(types).toEqual(["dead-click"]);
  });

  it("registers the click tracker and stores only rage-click events for capture=['rage-click']", async () => {
    const adapter = createRecordingAdapter();
    const engine = createCaptureEngine(baseEngineOptions(adapter, ["rage-click"]));

    expect(engine.start()).toBe(true);

    const button = document.createElement("button");
    button.textContent = "Click me";
    document.body.append(button);

    // Rage-click detection requires a burst of clustered clicks; plain
    // click/dead-click events must not be stored along the way.
    dispatchPointerUp(button);
    dispatchPointerUp(button);
    dispatchPointerUp(button);

    await vi.waitFor(() => {
      expect(adapter.saved.flat().length).toBeGreaterThan(0);
    });

    engine.stop();

    const types = adapter.saved.flat().map((event) => event.type);
    expect(types).toEqual(["rage-click"]);
  });

  it("does not register the click tracker when capture excludes click/rage-click/dead-click", () => {
    const adapter = createRecordingAdapter();
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    const engine = createCaptureEngine(baseEngineOptions(adapter, ["scroll"]));
    engine.start();

    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      "pointerup",
      expect.anything(),
      expect.anything(),
    );

    engine.stop();
    addEventListenerSpy.mockRestore();
  });
});
