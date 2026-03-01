import { fromViewportPercentages } from "../utils/coordinates";
import { buildGradientPalette, paletteColorAt } from "./gradient";
import type { Renderer, RenderOptions, RenderPoint } from "./types";

export class CanvasRenderer implements Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly shadowCanvas: HTMLCanvasElement;
  private readonly shadowContext: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("react-clickmap: Unable to create 2D rendering context");
    }

    const shadowCanvas = document.createElement("canvas");
    const shadowContext = shadowCanvas.getContext("2d");
    if (!shadowContext) {
      throw new Error("react-clickmap: Unable to create shadow canvas context");
    }

    this.canvas = canvas;
    this.context = context;
    this.shadowCanvas = shadowCanvas;
    this.shadowContext = shadowContext;

    this.resize(canvas.width, canvas.height);
  }

  resize(width: number, height: number): void {
    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));

    this.canvas.width = safeWidth;
    this.canvas.height = safeHeight;
    this.shadowCanvas.width = safeWidth;
    this.shadowCanvas.height = safeHeight;
  }

  clear(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.shadowContext.clearRect(0, 0, this.shadowCanvas.width, this.shadowCanvas.height);
  }

  render(points: RenderPoint[], options: RenderOptions): void {
    this.resize(options.width, options.height);
    this.clear();

    if (points.length === 0) {
      return;
    }

    if (options.mode === "clickmap") {
      this.renderClickmap(points, options);
      return;
    }

    this.renderHeatmap(points, options);
  }

  dispose(): void {
    this.clear();
  }

  private renderClickmap(points: RenderPoint[], options: RenderOptions): void {
    const palette = buildGradientPalette(options.gradient);

    for (const point of points) {
      const pixel = fromViewportPercentages(point.x, point.y, options.width, options.height);
      const color = paletteColorAt(palette, point.weight);

      this.context.beginPath();
      this.context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${Math.min(1, options.opacity)})`;
      this.context.arc(pixel.x, pixel.y, Math.max(2, options.radius * 0.4), 0, Math.PI * 2);
      this.context.fill();
    }
  }

  private renderHeatmap(points: RenderPoint[], options: RenderOptions): void {
    for (const point of points) {
      const pixel = fromViewportPercentages(point.x, point.y, options.width, options.height);
      const gradient = this.shadowContext.createRadialGradient(
        pixel.x,
        pixel.y,
        0,
        pixel.x,
        pixel.y,
        options.radius,
      );
      gradient.addColorStop(0, `rgba(0, 0, 0, ${Math.max(0.05, point.weight)})`);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      this.shadowContext.fillStyle = gradient;
      this.shadowContext.fillRect(
        pixel.x - options.radius,
        pixel.y - options.radius,
        options.radius * 2,
        options.radius * 2,
      );
    }

    const colorized = this.shadowContext.getImageData(
      0,
      0,
      this.shadowCanvas.width,
      this.shadowCanvas.height,
    );
    const palette = buildGradientPalette(options.gradient);

    for (let index = 0; index < colorized.data.length; index += 4) {
      const alpha = colorized.data[index + 3] ?? 0;
      if (alpha === 0) {
        continue;
      }

      const color = paletteColorAt(palette, alpha / 255);
      colorized.data[index] = color.r;
      colorized.data[index + 1] = color.g;
      colorized.data[index + 2] = color.b;
      colorized.data[index + 3] = Math.min(255, Math.floor(alpha * options.opacity));
    }

    this.context.putImageData(colorized, 0, 0);
  }
}
