export function throttle<T extends (...args: never[]) => void>(
  callback: T,
  waitMs: number,
): (...args: Parameters<T>) => void {
  let lastCallTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let trailingArgs: Parameters<T> | undefined;

  return (...args: Parameters<T>): void => {
    const now = Date.now();
    const elapsed = now - lastCallTime;

    if (elapsed >= waitMs) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }

      lastCallTime = now;
      callback(...args);
      trailingArgs = undefined;
      return;
    }

    trailingArgs = args;

    if (timeoutId) {
      return;
    }

    const remaining = waitMs - elapsed;
    timeoutId = setTimeout(() => {
      timeoutId = undefined;
      if (!trailingArgs) {
        return;
      }

      lastCallTime = Date.now();
      callback(...trailingArgs);
      trailingArgs = undefined;
    }, remaining);
  };
}
