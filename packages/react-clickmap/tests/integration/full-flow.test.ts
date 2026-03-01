import { afterEach, describe, expect, it } from "vitest";
import { memoryAdapter } from "../../src/adapters/memory-adapter";
import { createCaptureEngine } from "../../src/capture/engine";

function dispatchPointerUp(target: Element): void {
  const init = {
    bubbles: true,
    button: 0,
    clientX: 64,
    clientY: 32,
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

async function delay(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

describe("integration flow", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("captures click events and persists them through the batcher", async () => {
    const adapter = memoryAdapter();
    const engine = createCaptureEngine({
      adapter,
      capture: ["click"],
      projectId: "project-int",
      sessionId: "session-int",
      userId: undefined,
      flushIntervalMs: 20,
      sampleRate: 1,
      enabled: true,
      consentRequired: false,
      hasConsent: true,
      respectDoNotTrack: false,
      respectGlobalPrivacyControl: false,
      ignoreSelectors: [],
      maskSelectors: [],
    });

    const started = engine.start();
    expect(started).toBe(true);

    const button = document.createElement("button");
    button.textContent = "Buy";
    document.body.append(button);

    dispatchPointerUp(button);
    await delay(40);
    engine.stop();
    await delay(10);

    const events = await adapter.load({});
    expect(events.some((event) => event.type === "click")).toBe(true);
    expect(events[0]?.projectId).toBe("project-int");
  });
});
