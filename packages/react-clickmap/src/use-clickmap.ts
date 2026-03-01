"use client";

import { useContext, useSyncExternalStore } from "react";
import { ClickmapContext, type ClickmapContextValue } from "./provider";

export function useClickmap(): ClickmapContextValue {
  const context = useContext(ClickmapContext);
  if (!context) {
    throw new Error("useClickmap must be used within <ClickmapProvider>.");
  }

  const snapshot = useSyncExternalStore(
    context.subscribe,
    context.getSnapshot,
    context.getServerSnapshot,
  );

  return {
    ...snapshot,
    start: context.start,
    stop: context.stop,
  };
}
