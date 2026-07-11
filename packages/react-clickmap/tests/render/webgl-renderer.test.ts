import { afterEach, describe, expect, it, vi } from "vitest";
import { WebGLRenderer } from "../../src/render/webgl-renderer";

function createFakeGlContext() {
  const calls = {
    getContextArgs: [] as unknown[],
    texImage2D: [] as unknown[][],
  };

  const gl = {
    // constants (values are arbitrary but must be internally consistent)
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    STREAM_DRAW: 6,
    FLOAT: 7,
    POINTS: 8,
    BLEND: 9,
    SRC_ALPHA: 10,
    ONE: 11,
    COLOR_BUFFER_BIT: 12,
    TEXTURE_2D: 13,
    TEXTURE0: 14,
    RGBA: 15,
    UNSIGNED_BYTE: 16,
    CLAMP_TO_EDGE: 17,
    LINEAR: 18,
    TEXTURE_WRAP_S: 19,
    TEXTURE_WRAP_T: 20,
    TEXTURE_MIN_FILTER: 21,
    TEXTURE_MAG_FILTER: 22,

    createShader: () => ({}),
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => true,
    getShaderInfoLog: () => "",
    deleteShader: () => {},
    createProgram: () => ({}),
    attachShader: () => {},
    linkProgram: () => {},
    getProgramParameter: () => true,
    getProgramInfoLog: () => "",
    detachShader: () => {},
    deleteProgram: () => {},
    getAttribLocation: () => 0,
    getUniformLocation: (_program: unknown, name: string) => ({ name }),
    createBuffer: () => ({}),
    deleteBuffer: () => {},
    createTexture: () => ({}),
    deleteTexture: () => {},
    bindTexture: () => {},
    texParameteri: () => {},
    texImage2D: (...args: unknown[]) => {
      calls.texImage2D.push(args);
    },
    bindBuffer: () => {},
    bufferData: () => {},
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    uniform2f: () => {},
    uniform1f: () => {},
    uniform1i: () => {},
    activeTexture: () => {},
    drawArrays: () => {},
    useProgram: () => {},
    enable: () => {},
    blendFunc: () => {},
    viewport: () => {},
    clearColor: () => {},
    clear: () => {},
  };

  return { gl, calls };
}

describe("WebGLRenderer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests a WebGL context with preserveDrawingBuffer so exports are not blank", () => {
    const { gl } = createFakeGlContext();
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockImplementation((type: string) => {
        if (type === "webgl2" || type === "webgl") {
          return gl as unknown as WebGLRenderingContext;
        }
        return null;
      });

    const canvas = document.createElement("canvas");
    // biome-ignore lint/correctness/noUnusedVariables: constructed for its side effects
    const renderer = new WebGLRenderer(canvas);

    expect(getContextSpy).toHaveBeenCalledWith("webgl2", { preserveDrawingBuffer: true });

    const webglCall = getContextSpy.mock.calls.find(([type]) => type === "webgl");
    if (webglCall) {
      expect(webglCall[1]).toEqual({ preserveDrawingBuffer: true });
    }
  });

  it("uploads a gradient texture that reflects the requested gradient stops", () => {
    const { gl, calls } = createFakeGlContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((type: string) => {
      if (type === "webgl2" || type === "webgl") {
        return gl as unknown as WebGLRenderingContext;
      }
      return null;
    });

    const canvas = document.createElement("canvas");
    const renderer = new WebGLRenderer(canvas);

    renderer.render([{ x: 10, y: 10, weight: 1 }], {
      width: 100,
      height: 100,
      opacity: 0.5,
      radius: 20,
      mode: "heatmap",
      gradient: { 0: "#0000ff", 1: "#ff0000" },
    });

    expect(calls.texImage2D.length).toBeGreaterThan(0);

    const callsAfterFirstRender = calls.texImage2D.length;

    // Re-rendering with the same gradient should not re-upload the texture.
    renderer.render([{ x: 10, y: 10, weight: 1 }], {
      width: 100,
      height: 100,
      opacity: 0.5,
      radius: 20,
      mode: "heatmap",
      gradient: { 0: "#0000ff", 1: "#ff0000" },
    });

    expect(calls.texImage2D.length).toBe(callsAfterFirstRender);

    // A different gradient must trigger a re-upload.
    renderer.render([{ x: 10, y: 10, weight: 1 }], {
      width: 100,
      height: 100,
      opacity: 0.5,
      radius: 20,
      mode: "heatmap",
      gradient: { 0: "#00ff00", 1: "#ffff00" },
    });

    expect(calls.texImage2D.length).toBeGreaterThan(callsAfterFirstRender);
  });
});
