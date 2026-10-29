import { useSyncExternalStore } from 'react';
import { localRaw, type SyncStorage } from '../../state/storage';

/**
 * MY HIGH SCORES — local only. One integer per game under
 * `iys2006.games.<id>.highScore`, written through the app's storage wrapper
 * (memory fallback when storage is blocked). No accounts, nothing is sent
 * anywhere, and there is no global leaderboard.
 */
export type ScoreId = 'snake' | 'stacks' | 'chomp' | 'tower' | 'invaders' | 'purbale-closet' | 'purbale-pairs' | 'purbale-pack';

export const scoreKey = (id: ScoreId) => `iys2006.games.${id}.highScore`;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function readBest(id: ScoreId, store: SyncStorage = localRaw): number {
  try {
    const n = Number(store.getItem(scoreKey(id)));
    return Number.isSafeInteger(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Saves only a strictly better score. Never throws (storage failure = the run still ends normally). */
export function submitScore(id: ScoreId, score: number, store: SyncStorage = localRaw): { best: number; isNew: boolean } {
  const s = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  const prev = readBest(id, store);
  if (s <= prev) return { best: prev, isNew: false };
  try {
    store.setItem(scoreKey(id), String(s));
  } catch {
    // blocked storage: the new best still shows for this run
  }
  emit();
  return { best: s, isNew: true };
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => e.key?.startsWith('iys2006.games.') && l();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener('storage', onStorage);
  };
}

export function useBest(id: ScoreId): number {
  return useSyncExternalStore(subscribe, () => readBest(id), () => 0);
}
