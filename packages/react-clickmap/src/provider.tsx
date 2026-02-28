import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { createCaptureEngine, type CaptureEngine } from './capture/engine';
import { getOrCreateSessionId } from './capture/session';
import type { CaptureType, ClickmapAdapter } from './types';

const DEFAULT_CAPTURE: CaptureType[] = ['click', 'scroll'];
const DEFAULT_MASK_SELECTORS = ['input', 'textarea', '[contenteditable]', '[data-clickmap-mask]'];

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

export const ClickmapContext = createContext<ClickmapContextValue | undefined>(undefined);

function assertAdapter(adapter: ClickmapAdapter | undefined): asserts adapter is ClickmapAdapter {
  if (!adapter) {
    throw new Error(
      'react-clickmap: No adapter provided to <ClickmapProvider>. Use memoryAdapter() for development.'
    );
  }
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
  children
}: ClickmapProviderProps): JSX.Element {
  assertAdapter(adapter);

  const [isCapturing, setIsCapturing] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const [queueSize, setQueueSize] = useState(0);
  const sessionId = useMemo(() => getOrCreateSessionId(), []);

  const engineRef = useRef<CaptureEngine | undefined>(undefined);

  const stop = useCallback(() => {
    engineRef.current?.stop();
    setIsCapturing(false);
    setQueueSize(0);
  }, []);

  const start = useCallback(() => {
    const started = engineRef.current?.start() ?? false;
    setIsCapturing(started);
    setQueueSize(engineRef.current?.queueSize() ?? 0);
  }, []);

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
        setEventCount((current) => current + 1);
        setQueueSize(engineRef.current?.queueSize() ?? 0);
      }
    });

    engineRef.current = engine;
    const started = engine.start();

    setIsCapturing(started);
    setQueueSize(engine.queueSize());

    return () => {
      engine.stop();
      engineRef.current = undefined;
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
    sessionId
  ]);

  const contextValue = useMemo<ClickmapContextValue>(
    () => ({
      isCapturing,
      eventCount,
      queueSize,
      sessionId,
      start,
      stop
    }),
    [eventCount, isCapturing, queueSize, sessionId, start, stop]
  );

  return <ClickmapContext.Provider value={contextValue}>{children}</ClickmapContext.Provider>;
}
