import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { memoryAdapter } from "../src/adapters/memory-adapter";
import * as engineModule from "../src/capture/engine";
import { ClickmapProvider } from "../src/provider";
import { useClickmap } from "../src/use-clickmap";

function Probe() {
  const clickmap = useClickmap();
  return <span data-testid="state">{clickmap.isCapturing ? "on" : "off"}</span>;
}

describe("ClickmapProvider", () => {
  it("captures scroll events", async () => {
    const adapter = memoryAdapter();

    render(
      <ClickmapProvider
        adapter={adapter}
        capture={["scroll"]}
        maxBatchSize={1}
        flushIntervalMs={50}
      >
        <Probe />
      </ClickmapProvider>,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-testid="state"]')?.textContent).toBe("on");
    });

    fireEvent.scroll(window);

    await waitFor(() => {
      expect(adapter.inspect().length).toBeGreaterThan(0);
    });

    expect(adapter.inspect()[0]?.type).toBe("scroll");
  });

  it("does not capture without consent when required", async () => {
    const adapter = memoryAdapter();

    render(
      <ClickmapProvider
        adapter={adapter}
        capture={["click"]}
        maxBatchSize={1}
        consentRequired
        hasConsent={false}
      >
        <Probe />
      </ClickmapProvider>,
    );

    fireEvent.pointerUp(window, {
      button: 0,
      clientX: 50,
      clientY: 50,
      pointerType: "mouse",
    });

    await waitFor(() => {
      expect(adapter.inspect()).toHaveLength(0);
    });
  });

  it("starts capturing after consent is granted", async () => {
    const adapter = memoryAdapter();

    const { rerender } = render(
      <ClickmapProvider
        adapter={adapter}
        capture={["click"]}
        maxBatchSize={1}
        consentRequired
        hasConsent={false}
      >
        <Probe />
      </ClickmapProvider>,
    );

    fireEvent.pointerUp(window, {
      button: 0,
      clientX: 24,
      clientY: 24,
      pointerType: "mouse",
    });

    await waitFor(() => {
      expect(adapter.inspect()).toHaveLength(0);
    });

    rerender(
      <ClickmapProvider
        adapter={adapter}
        capture={["click"]}
        maxBatchSize={1}
        consentRequired
        hasConsent
      >
        <Probe />
      </ClickmapProvider>,
    );

    fireEvent.pointerUp(window, {
      button: 0,
      clientX: 30,
      clientY: 30,
      pointerType: "mouse",
    });

    await waitFor(() => {
      expect(adapter.inspect().length).toBeGreaterThan(0);
    });
  });

  it("does not rebuild the capture engine when array props are new-but-equal inline literals", async () => {
    const adapter = memoryAdapter();
    const createEngineSpy = vi.spyOn(engineModule, "createCaptureEngine");

    function Wrapper() {
      return (
        <ClickmapProvider
          adapter={adapter}
          capture={["click", "scroll"]}
          maskSelectors={["input"]}
          ignoreSelectors={["[data-ignore]"]}
          maxBatchSize={1}
        >
          <Probe />
        </ClickmapProvider>
      );
    }

    const { rerender } = render(<Wrapper />);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="state"]')?.textContent).toBe("on");
    });

    expect(createEngineSpy).toHaveBeenCalledTimes(1);

    // Re-render several times with brand-new array instances that contain
    // the same values. Prior to the fix, this rebuilt the engine every time.
    rerender(<Wrapper />);
    rerender(<Wrapper />);
    rerender(<Wrapper />);

    expect(createEngineSpy).toHaveBeenCalledTimes(1);

    createEngineSpy.mockRestore();
  });
});
