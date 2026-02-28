/* eslint-disable no-restricted-globals */

import type { RenderOptions, RenderPoint } from './types';

interface WorkerRenderMessage {
  type: 'render';
  points: RenderPoint[];
  options: RenderOptions;
}

interface WorkerResizeMessage {
  type: 'resize';
  width: number;
  height: number;
}

interface WorkerCanvasMessage {
  type: 'canvas';
  canvas: OffscreenCanvas;
}

type WorkerMessage = WorkerRenderMessage | WorkerResizeMessage | WorkerCanvasMessage;

let canvas: OffscreenCanvas | undefined;
let context: OffscreenCanvasRenderingContext2D | null = null;

self.onmessage = (event: MessageEvent<WorkerMessage>): void => {
  const message = event.data;

  if (message.type === 'canvas') {
    canvas = message.canvas;
    context = canvas.getContext('2d');
    return;
  }

  if (!canvas || !context) {
    return;
  }

  if (message.type === 'resize') {
    canvas.width = message.width;
    canvas.height = message.height;
    return;
  }

  if (message.type === 'render') {
    context.clearRect(0, 0, canvas.width, canvas.height);

    for (const point of message.points) {
      const x = (point.x / 100) * canvas.width;
      const y = (point.y / 100) * canvas.height;
      context.beginPath();
      context.fillStyle = `rgba(255, 0, 0, ${Math.max(0.1, point.weight * message.options.opacity)})`;
      context.arc(x, y, message.options.radius, 0, Math.PI * 2);
      context.fill();
    }
  }
};
