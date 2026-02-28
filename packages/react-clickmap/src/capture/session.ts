const SESSION_STORAGE_KEY = 'react-clickmap:session-id';

export function createAnonymousSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') {
    return createAnonymousSessionId();
  }

  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const generated = createAnonymousSessionId();
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, generated);
    return generated;
  } catch {
    return createAnonymousSessionId();
  }
}
