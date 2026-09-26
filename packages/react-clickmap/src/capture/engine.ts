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
  layoutId?: string;
  normalizeRoute?: (pathname: string) => string;
  beforeCapture?: (
    event: import("../types").CaptureEvent,
  ) => import("../types").CaptureEvent | null;
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
    ...(options.maxBatchSize !== undefined ? { maxBatchSize: options.maxBatchSize } : {}),
    ...(options.onError ? { onError: options.onError } : {}),
  });

  let running = false;

  const emitCaptured = (event: Parameters<EventBatcher["push"]>[0]): void => {
    const normalize = options.normalizeRoute ?? ((path: string) => path);
    const next = {
      ...event,
      pathname: normalize(event.pathname),
      routeKey: normalize(event.routeKey),
      ...(options.layoutId ? { layoutId: options.layoutId } : {}),
    };
    const sanitized = options.beforeCapture ? options.beforeCapture(next) : next;
    if (!sanitized) return;
    batcher.push(sanitized);
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

    if (
      enabledCapture.has("click") ||
      enabledCapture.has("rage-click") ||
      enabledCapture.has("dead-click")
    ) {
      cleanupCallbacks.push(
        createClickTracker({
          projectId: options.projectId,
          sessionId: options.sessionId,
          userId: options.userId,
          deviceType,
          getPathname: getCurrentPathname,
          getRouteKey: getCurrentRouteKey,
          emit: emitCaptured,
          enableClicks: enabledCapture.has("click"),
          enableDeadClicks: enabledCapture.has("dead-click"),
          enableRageClicks: enabledCapture.has("rage-click"),
          ignoreSelectors: [
            ...options.ignoreSelectors,
            "[data-clickmap-ignore]",
            "[data-clickmap-studio]",
          ],
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
          ignoreSelectors: [
            ...options.ignoreSelectors,
            "[data-clickmap-ignore]",
            "[data-clickmap-studio]",
          ],
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
