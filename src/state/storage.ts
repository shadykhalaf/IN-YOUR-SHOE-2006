import { createJSONStorage } from 'zustand/middleware';

/** Synchronous string storage (a StateStorage that never returns a promise). */
export interface SyncStorage {
  getItem: (k: string) => string | null;
  setItem: (k: string, v: string) => void;
  removeItem: (k: string) => void;
}

/** Storage that survives private mode / blocked storage by degrading to memory. */
function safe(get: () => Storage): SyncStorage {
  const memory = new Map<string, string>();
  return {
    getItem: (k) => {
      try {
        return get().getItem(k);
      } catch {
        return memory.get(k) ?? null;
      }
    },
    setItem: (k, v) => {
      try {
        get().setItem(k, v);
      } catch {
        memory.set(k, v);
      }
    },
    removeItem: (k) => {
      try {
        get().removeItem(k);
      } catch {
        memory.delete(k);
      }
    },
  };
}

/** Raw string storage with the same memory fallback (for small non-Zustand metadata, e.g. game high scores). */
export const localRaw: SyncStorage = safe(() => window.localStorage);

export const local = createJSONStorage(() => localRaw);
export const session = createJSONStorage(() => safe(() => window.sessionStorage));
