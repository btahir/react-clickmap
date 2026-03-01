import { describe, expect, it, vi } from "vitest";
import { createRenderer } from "../../src/render";
import { CanvasRenderer } from "../../src/render/canvas-renderer";

function createFakeCanvasContext(): CanvasRenderingContext2D {
  return {
    clearRect: () => {},
    fillRect: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    createRadialGradient: () =>
      ({
        addColorStop: () => {},
      }) as CanvasGradient,
    getImageData: () =>
      ({
        data: new Uint8ClampedArray(4),
      }) as ImageData,
    putImageData: () => {},
    save: () => {},
    restore: () => {},
    globalCompositeOperation: "source-over",
    fillStyle: "#000",
    globalAlpha: 1,
    drawImage: () => {},
  } as unknown as CanvasRenderingContext2D;
}

describe("createRenderer", () => {
  it("falls back to canvas renderer when webgl contexts are unavailable", () => {
    const canvas = document.createElement("canvas");
    const fakeContext = createFakeCanvasContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((type: string) => {
      if (type === "2d") {
        return fakeContext;
      }

      return null;
    });

    const renderer = createRenderer(canvas, { preferWebGL: true });

    expect(renderer).toBeInstanceOf(CanvasRenderer);
  });
});
