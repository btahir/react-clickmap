import { render, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { memoryAdapter } from "../src/adapters/memory-adapter";
import { Heatmap, type HeatmapHandle } from "../src/heatmap";
import { createEvent } from "./fixtures";

vi.mock("../src/render", () => ({
  createRenderer: () => ({
    resize: () => {},
    render: () => {},
    clear: () => {},
    dispose: () => {},
  }),
  DEFAULT_GRADIENT: {
    0: "#0000ff",
    1: "#ff0000",
  },
}));

const originalToDataUrl = HTMLCanvasElement.prototype.toDataURL;
const originalToBlob = HTMLCanvasElement.prototype.toBlob;

describe("Heatmap export handle", () => {
  afterEach(() => {
    HTMLCanvasElement.prototype.toDataURL = originalToDataUrl;
    HTMLCanvasElement.prototype.toBlob = originalToBlob;
    vi.restoreAllMocks();
  });

  it("exposes toDataUrl and toBlob export helpers", async () => {
    Object.defineProperty(HTMLCanvasElement.prototype, "toDataURL", {
      configurable: true,
      value: vi.fn(() => "data:image/png;base64,ZmFrZQ=="),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", {
      configurable: true,
      value: vi.fn((callback: BlobCallback) => callback(new Blob(["fake"], { type: "image/png" }))),
    });

    const adapter = memoryAdapter([createEvent({ pathname: "/export" })]);
    const ref = createRef<HeatmapHandle>();

    render(<Heatmap ref={ref} adapter={adapter} page="/export" />);

    await waitFor(() => {
      expect(ref.current).toBeTruthy();
    });

    expect(ref.current?.toDataUrl()).toBe("data:image/png;base64,ZmFrZQ==");
    const blob = await ref.current?.toBlob();
    expect(blob).toBeInstanceOf(Blob);
  });
});
