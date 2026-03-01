import { isDoNotTrackEnabled, isGlobalPrivacyControlEnabled } from "../privacy/signals";
import type { CaptureType, ClickmapAdapter } from "../types";
import { shouldSampleSession } from "../utils/hash";
import { EventBatcher } from "./batcher";
import { createClickTracker } from "./click-tracker";
import { detectDeviceType } from "./device";
import { createPointerMoveTracker } from "./pointer-move-tracker";
import { getCurrentPathname, getCurrentRouteKey, subscribeRouteChanges } from "./route";
import { createScrollTracker } from "./scroll-tracker";

export interface CaptureEngineOptions {
  adapter: ClickmapAdapter;
  capture: CaptureType[];
  projectId: string;
  sessionId: string;
  userId: string | undefined;
  flushIntervalMs: number;
  maxBatchSize?: number;
  sampleRate: number;
  enabled: boolean;
  consentRequired: boolean;
  hasConsent: boolean;
  respectDoNotTrack: boolean;
  respectGlobalPrivacyControl: boolean;
  ignoreSelectors: string[];
  maskSelectors: string[];
  onEventCaptured?: () => void;
  onError?: (error: unknown) => void;
}

export interface CaptureEngine {
  start: () => boolean;
  stop: () => void;
  isCapturing: () => boolean;
  queueSize: () => number;
}

function isPrivacyOptOut(
  options: Pick<CaptureEngineOptions, "respectDoNotTrack" | "respectGlobalPrivacyControl">,
): boolean {
  if (options.respectDoNotTrack && isDoNotTrackEnabled()) {
    return true;
  }

  if (options.respectGlobalPrivacyControl && isGlobalPrivacyControlEnabled()) {
    return true;
  }

  return false;
}

export function createCaptureEngine(options: CaptureEngineOptions): CaptureEngine {
  const enabledCapture = new Set(options.capture);
  const cleanupCallbacks: Array<() => void> = [];
  const deviceType = detectDeviceType();

  const batcher = new EventBatcher({
    adapter: options.adapter,
    flushIntervalMs: options.flushIntervalMs,
    maxBatchSize: options.maxBatchSize,
    onError: options.onError,
  });

  let running = false;

  const emitCaptured = (event: Parameters<EventBatcher["push"]>[0]): void => {
    batcher.push(event);
    options.onEventCaptured?.();
  };

  const start = (): boolean => {
    if (running) {
      return true;
    }

    if (!options.enabled) {
      return false;
    }

    if (options.consentRequired && !options.hasConsent) {
      return false;
    }

    if (isPrivacyOptOut(options)) {
      return false;
    }

    if (!shouldSampleSession(options.sessionId, options.sampleRate)) {
      return false;
    }

    batcher.start();
    cleanupCallbacks.push(
      subscribeRouteChanges(() => {
        void batcher.flush("manual");
      }),
    );

    if (enabledCapture.has("click") || enabledCapture.has("rage-click")) {
      cleanupCallbacks.push(
        createClickTracker({
          projectId: options.projectId,
          sessionId: options.sessionId,
          userId: options.userId,
          deviceType,
          getPathname: getCurrentPathname,
          getRouteKey: getCurrentRouteKey,
          emit: emitCaptured,
          enableDeadClicks: enabledCapture.has("dead-click"),
          enableRageClicks: enabledCapture.has("rage-click"),
          ignoreSelectors: options.ignoreSelectors,
          maskSelectors: options.maskSelectors,
        }),
      );
    }

    if (enabledCapture.has("scroll")) {
      cleanupCallbacks.push(
        createScrollTracker({
          projectId: options.projectId,
          sessionId: options.sessionId,
          userId: options.userId,
          deviceType,
          getPathname: getCurrentPathname,
          getRouteKey: getCurrentRouteKey,
          emit: emitCaptured,
        }),
      );
    }

    if (enabledCapture.has("pointer-move")) {
      cleanupCallbacks.push(
        createPointerMoveTracker({
          projectId: options.projectId,
          sessionId: options.sessionId,
          userId: options.userId,
          deviceType,
          getPathname: getCurrentPathname,
          getRouteKey: getCurrentRouteKey,
          emit: emitCaptured,
          ignoreSelectors: options.ignoreSelectors,
        }),
      );
    }

    running = true;
    return true;
  };

  const stop = (): void => {
    if (!running) {
      return;
    }

    while (cleanupCallbacks.length > 0) {
      const cleanup = cleanupCallbacks.pop();
      cleanup?.();
    }

    batcher.stop();
    running = false;
  };

  return {
    start,
    stop,
    isCapturing: () => running,
    queueSize: () => batcher.size(),
  };
}
