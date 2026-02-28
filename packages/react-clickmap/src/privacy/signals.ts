interface NavigatorWithPrivacySignals extends Navigator {
  msDoNotTrack?: string;
  globalPrivacyControl?: boolean;
}

type DntValue = string | null | undefined;

function isDntTruthy(value: DntValue): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();
  return normalized === '1' || normalized === 'yes';
}

export function isDoNotTrackEnabled(navigatorLike?: NavigatorWithPrivacySignals): boolean {
  const activeNavigator =
    navigatorLike ??
    (typeof navigator !== 'undefined' ? (navigator as NavigatorWithPrivacySignals) : undefined);
  const windowDnt =
    typeof window !== 'undefined'
      ? (window as Window & { doNotTrack?: string }).doNotTrack
      : undefined;

  if (!activeNavigator) {
    return false;
  }

  return (
    isDntTruthy(activeNavigator.doNotTrack) ||
    isDntTruthy(activeNavigator.msDoNotTrack) ||
    isDntTruthy(windowDnt)
  );
}

export function isGlobalPrivacyControlEnabled(navigatorLike?: NavigatorWithPrivacySignals): boolean {
  const activeNavigator = navigatorLike ?? (typeof navigator !== 'undefined' ? (navigator as NavigatorWithPrivacySignals) : undefined);

  return Boolean(activeNavigator?.globalPrivacyControl === true);
}
