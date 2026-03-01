"use client";

import { createContext, type ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { type CaptureEngine, createCaptureEngine } from "./capture/engine";
import { getOrCreateSessionId } from "./capture/session";
import {
  type ClickmapRuntimeStore,
  type ClickmapSnapshot,
  createRuntimeStore,
} from "./runtime-store";
import type { CaptureType, ClickmapAdapter } from "./types";

const DEFAULT_CAPTURE: CaptureType[] = ["click", "scroll"];
const DEFAULT_MASK_SELECTORS = ["input", "textarea", "[contenteditable]", "[data-clickmap-mask]"];

export interface ClickmapProviderProps {
  adapter: ClickmapAdapter;
  capture?: CaptureType[];
  sampleRate?: number;
  respectDoNotTrack?: boolean;
  respectGlobalPrivacyControl?: boolean;
  maskSelectors?: string[];
  ignoreSelectors?: string[];
  consentRequired?: boolean;
  hasConsent?: boolean;
  flushIntervalMs?: number;
  maxBatchSize?: number;
  enabled?: boolean;
  children: ReactNode;
}

export interface ClickmapContextValue {
  isCapturing: boolean;
  eventCount: number;
  queueSize: number;
  sessionId: string;
  start: () => void;
  stop: () => void;
}

interface ClickmapProviderStoreContext {
  getSnapshot: () => ClickmapSnapshot;
  getServerSnapshot: () => ClickmapSnapshot;
  subscribe: (listener: () => void) => () => void;
  start: () => void;
  stop: () => void;
}

export const ClickmapContext = createContext<ClickmapProviderStoreContext | undefined>(undefined);

function assertAdapter(adapter: ClickmapAdapter | undefined): asserts adapter is ClickmapAdapter {
  if (!adapter) {
    throw new Error(
      "react-clickmap: No adapter provided to <ClickmapProvider>. Use memoryAdapter() for development.",
    );
  }
}

function updateStoreCaptureState(store: ClickmapRuntimeStore, isCapturing: boolean): void {
  store.setState((current) => ({
    ...current,
    isCapturing,
    queueSize: isCapturing ? current.queueSize : 0,
  }));
}

export function ClickmapProvider({
  adapter,
  capture = DEFAULT_CAPTURE,
  sampleRate = 1,
  respectDoNotTrack = true,
  respectGlobalPrivacyControl = true,
  maskSelectors = DEFAULT_MASK_SELECTORS,
  ignoreSelectors = [],
  consentRequired = false,
  hasConsent = true,
  flushIntervalMs = 5000,
  maxBatchSize = 100,
  enabled = true,
  children,
}: ClickmapProviderProps) {
  assertAdapter(adapter);

  const sessionId = useMemo(() => getOrCreateSessionId(), []);
  const storeRef = useRef<ClickmapRuntimeStore | undefined>(undefined);
  const engineRef = useRef<CaptureEngine | undefined>(undefined);

  if (!storeRef.current) {
    storeRef.current = createRuntimeStore({
      isCapturing: false,
      eventCount: 0,
      queueSize: 0,
      sessionId,
    });
  }

  const store = storeRef.current;

  const stop = useCallback(() => {
    engineRef.current?.stop();
    updateStoreCaptureState(store, false);
  }, [store]);

  const start = useCallback(() => {
    const started = engineRef.current?.start() ?? false;
    store.setState((current) => ({
      ...current,
      isCapturing: started,
      queueSize: engineRef.current?.queueSize() ?? 0,
    }));
  }, [store]);

  useEffect(() => {
    const engine = createCaptureEngine({
      adapter,
      capture,
      sessionId,
      flushIntervalMs,
      maxBatchSize,
      sampleRate,
      enabled,
      consentRequired,
      hasConsent,
      respectDoNotTrack,
      respectGlobalPrivacyControl,
      ignoreSelectors,
      maskSelectors,
      onEventCaptured: () => {
        store.setState((current) => ({
          ...current,
          eventCount: current.eventCount + 1,
          queueSize: engineRef.current?.queueSize() ?? current.queueSize,
        }));
      },
    });

    engineRef.current = engine;

    const started = engine.start();
    store.setState((current) => ({
      ...current,
      isCapturing: started,
      queueSize: engine.queueSize(),
    }));

    return () => {
      engine.stop();
      engineRef.current = undefined;
      updateStoreCaptureState(store, false);
    };
  }, [
    adapter,
    capture,
    consentRequired,
    enabled,
    flushIntervalMs,
    hasConsent,
    ignoreSelectors,
    maskSelectors,
    maxBatchSize,
    respectDoNotTrack,
    respectGlobalPrivacyControl,
    sampleRate,
    sessionId,
    store,
  ]);

  const contextValue = useMemo<ClickmapProviderStoreContext>(
    () => ({
      getSnapshot: store.getSnapshot,
      getServerSnapshot: store.getServerSnapshot,
      subscribe: store.subscribe,
      start,
      stop,
    }),
    [start, stop, store.getServerSnapshot, store.getSnapshot, store.subscribe],
  );

  return <ClickmapContext.Provider value={contextValue}>{children}</ClickmapContext.Provider>;
}
