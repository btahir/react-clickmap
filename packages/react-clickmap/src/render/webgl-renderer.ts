import { fromViewportPercentages } from '../utils/coordinates';
import type { RenderOptions, RenderPoint, Renderer } from './types';

const VERTEX_SHADER = `
attribute vec2 a_position;
attribute float a_weight;
uniform vec2 u_resolution;
uniform float u_pointSize;
varying float v_weight;

void main() {
  vec2 zeroToOne = a_position / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;
  gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
  gl_PointSize = u_pointSize;
  v_weight = a_weight;
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
varying float v_weight;
uniform float u_opacity;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5, 0.5);
  float distance = length(center);
  float falloff = smoothstep(0.5, 0.0, distance);

  vec3 low = vec3(0.0, 0.2, 1.0);
  vec3 high = vec3(1.0, 0.0, 0.0);
  vec3 color = mix(low, high, clamp(v_weight, 0.0, 1.0));

  gl_FragColor = vec4(color, falloff * u_opacity * max(0.15, v_weight));
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('react-clickmap: Unable to allocate shader');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? 'unknown shader compile error';
    gl.deleteShader(shader);
    throw new Error(`react-clickmap: Shader compile failed: ${info}`);
  }

  return shader;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

  const program = gl.createProgram();
  if (!program) {
    throw new Error('react-clickmap: Unable to create WebGL program');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? 'unknown link error';
    throw new Error(`react-clickmap: Failed to link WebGL program: ${info}`);
  }

  return program;
}

export class WebGLRenderer implements Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGLRenderingContext;
  private readonly program: WebGLProgram;
  private readonly positionBuffer: WebGLBuffer;
  private readonly weightBuffer: WebGLBuffer;
  private readonly positionAttribute: number;
  private readonly weightAttribute: number;
  private readonly resolutionUniform: WebGLUniformLocation;
  private readonly pointSizeUniform: WebGLUniformLocation;
  private readonly opacityUniform: WebGLUniformLocation;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) {
      throw new Error('react-clickmap: WebGL is unavailable in this browser context');
    }

    const program = createProgram(gl);

    const positionBuffer = gl.createBuffer();
    const weightBuffer = gl.createBuffer();

    if (!positionBuffer || !weightBuffer) {
      throw new Error('react-clickmap: Unable to create WebGL buffers');
    }

    const positionAttribute = gl.getAttribLocation(program, 'a_position');
    const weightAttribute = gl.getAttribLocation(program, 'a_weight');

    const resolutionUniform = gl.getUniformLocation(program, 'u_resolution');
    const pointSizeUniform = gl.getUniformLocation(program, 'u_pointSize');
    const opacityUniform = gl.getUniformLocation(program, 'u_opacity');

    if (!resolutionUniform || !pointSizeUniform || !opacityUniform) {
      throw new Error('react-clickmap: Missing required WebGL uniforms');
    }

    this.canvas = canvas;
    this.gl = gl;
    this.program = program;
    this.positionBuffer = positionBuffer;
    this.weightBuffer = weightBuffer;
    this.positionAttribute = positionAttribute;
    this.weightAttribute = weightAttribute;
    this.resolutionUniform = resolutionUniform;
    this.pointSizeUniform = pointSizeUniform;
    this.opacityUniform = opacityUniform;

    this.resize(canvas.width, canvas.height);
  }

  resize(width: number, height: number): void {
    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));

    this.canvas.width = safeWidth;
    this.canvas.height = safeHeight;
    this.gl.viewport(0, 0, safeWidth, safeHeight);
  }

  clear(): void {
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  render(points: RenderPoint[], options: RenderOptions): void {
    this.resize(options.width, options.height);
    this.clear();

    if (points.length === 0) {
      return;
    }

    const positions = new Float32Array(points.length * 2);
    const weights = new Float32Array(points.length);

    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      if (!point) {
        continue;
      }

      const pixel = fromViewportPercentages(point.x, point.y, options.width, options.height);
      positions[index * 2] = pixel.x;
      positions[index * 2 + 1] = pixel.y;
      weights[index] = point.weight;
    }

    const gl = this.gl;
    gl.useProgram(this.program);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(this.positionAttribute);
    gl.vertexAttribPointer(this.positionAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.weightBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, weights, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(this.weightAttribute);
    gl.vertexAttribPointer(this.weightAttribute, 1, gl.FLOAT, false, 0, 0);

    gl.uniform2f(this.resolutionUniform, options.width, options.height);
    gl.uniform1f(this.pointSizeUniform, Math.max(2, options.radius * 1.6));
    gl.uniform1f(this.opacityUniform, options.opacity);

    gl.drawArrays(gl.POINTS, 0, points.length);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.positionBuffer);
    gl.deleteBuffer(this.weightBuffer);
    gl.deleteProgram(this.program);
  }
}
