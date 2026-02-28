export function throttle<T extends (...args: never[]) => void>(
  callback: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let lastCallTime = 0;

  return (...args: Parameters<T>): void => {
    const now = Date.now();
    if (now - lastCallTime < waitMs) {
      return;
    }

    lastCallTime = now;
    callback(...args);
  };
}
