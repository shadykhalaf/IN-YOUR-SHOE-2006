import { useSyncExternalStore } from 'react';
import { localRaw, type SyncStorage } from '../../state/storage';

/**
 * Catchy preferences only: on/off and the last resting spot (as fractions of
 * the desktop, so it survives resizes). No moods, no history, no telemetry.
 */
export const CATCHY_KEYS = { enabled: 'iys2006.catchy.enabled', position: 'iys2006.catchy.position' } as const;

const listeners = new Set<() => void>();

export function readEnabled(store: SyncStorage = localRaw): boolean {
  try {
    return store.getItem(CATCHY_KEYS.enabled) !== 'false';
  } catch {
    return true;
  }
}
export function writeEnabled(on: boolean, store: SyncStorage = localRaw) {
  try {
    store.setItem(CATCHY_KEYS.enabled, on ? 'true' : 'false');
    memory = null;
  } catch {
    // blocked storage: the choice still applies for this visit
    memory = on;
  }
  listeners.forEach((l) => l());
}
let memory: boolean | null = null;

export interface SavedSpot {
  fx: number;
  fy: number;
}
export function readPosition(store: SyncStorage = localRaw): SavedSpot | null {
  try {
    const raw = store.getItem(CATCHY_KEYS.position);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<SavedSpot>;
    const ok = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;
    return ok(v.fx) && ok(v.fy) ? { fx: v.fx!, fy: v.fy! } : null;
  } catch {
    return null;
  }
}
export function writePosition(spot: SavedSpot, store: SyncStorage = localRaw) {
  try {
    const c = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 1000) / 1000;
    store.setItem(CATCHY_KEYS.position, JSON.stringify({ fx: c(spot.fx), fy: c(spot.fy) }));
  } catch {
    // ignore
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => e.key === CATCHY_KEYS.enabled && l();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener('storage', onStorage);
  };
}
export function useCatchyEnabled(): boolean {
  return useSyncExternalStore(subscribe, () => memory ?? readEnabled(), () => true);
}
