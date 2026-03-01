export interface ClickmapSnapshot {
  isCapturing: boolean;
  eventCount: number;
  queueSize: number;
  sessionId: string;
}

type Listener = () => void;

type StateUpdater = (current: ClickmapSnapshot) => ClickmapSnapshot;

export interface ClickmapRuntimeStore {
  getSnapshot: () => ClickmapSnapshot;
  getServerSnapshot: () => ClickmapSnapshot;
  subscribe: (listener: Listener) => () => void;
  setState: (updater: StateUpdater) => void;
}

export function createRuntimeStore(initialState: ClickmapSnapshot): ClickmapRuntimeStore {
  let state = initialState;
  const listeners = new Set<Listener>();

  return {
    getSnapshot: () => state,
    getServerSnapshot: () => state,
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setState: (updater: StateUpdater) => {
      const next = updater(state);
      if (Object.is(next, state)) {
        return;
      }

      state = next;
      for (const listener of listeners) {
        listener();
      }
    },
  };
}
