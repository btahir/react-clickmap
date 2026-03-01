import { useContext } from "react";
import { ClickmapContext, type ClickmapContextValue } from "./provider";

export function useClickmap(): ClickmapContextValue {
  const context = useContext(ClickmapContext);
  if (!context) {
    throw new Error("useClickmap must be used within <ClickmapProvider>.");
  }

  return context;
}
