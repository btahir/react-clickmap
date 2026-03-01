import type { CaptureEvent, ClickmapAdapter } from "../types";

export type FlushReason = "interval" | "visibilitychange" | "pagehide" | "manual" | "stop";

export interface EventBatcherOptions {
  adapter: ClickmapAdapter;
  flushIntervalMs: number;
  maxBatchSize?: number;
  onFlush?: (flushedCount: number, reason: FlushReason) => void;
  onError?: (error: unknown) => void;
}

export class EventBatcher {
  private readonly adapter: ClickmapAdapter;
  private readonly flushIntervalMs: number;
  private readonly maxBatchSize: number;
  private readonly onFlush?: (flushedCount: number, reason: FlushReason) => void;
  private readonly onError?: (error: unknown) => void;
  private queue: CaptureEvent[] = [];
  private timer: ReturnType<typeof setInterval> | undefined;
  private isRunning = false;
  private isFlushing = false;

  constructor(options: EventBatcherOptions) {
    this.adapter = options.adapter;
    this.flushIntervalMs = options.flushIntervalMs;
    this.maxBatchSize = options.maxBatchSize ?? 100;
    this.onFlush = options.onFlush;
    this.onError = options.onError;

    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handlePageHide = this.handlePageHide.bind(this);
  }

  start(): void {
    if (this.isRunning || typeof window === "undefined") {
      return;
    }

    this.isRunning = true;
    this.timer = setInterval(() => {
      void this.flush("interval");
    }, this.flushIntervalMs);

    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("pagehide", this.handlePageHide);
  }

  stop(): void {
    if (!this.isRunning || typeof window === "undefined") {
      return;
    }

    this.isRunning = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    window.removeEventListener("pagehide", this.handlePageHide);

    void this.flush("stop");
  }

  push(event: CaptureEvent): void {
    this.queue.push(event);
    if (this.queue.length >= this.maxBatchSize) {
      void this.flush("manual");
    }
  }

  size(): number {
    return this.queue.length;
  }

  async flush(reason: FlushReason): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) {
      return;
    }

    const events = this.queue;
    this.queue = [];
    this.isFlushing = true;

    try {
      await this.adapter.save(events);
      this.onFlush?.(events.length, reason);
    } catch (error) {
      this.queue = events.concat(this.queue);
      this.onError?.(error);
    } finally {
      this.isFlushing = false;
    }
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === "hidden") {
      void this.flush("visibilitychange");
    }
  }

  private handlePageHide(): void {
    void this.flush("pagehide");
  }
}
