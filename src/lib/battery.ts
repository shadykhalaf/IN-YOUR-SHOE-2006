import { useEffect, useState } from 'react';

/**
 * Real battery → the IYS Mobile status bar's existing 3-bar icon.
 *
 * Progressive enhancement only: where the browser exposes the Battery Status
 * API (`navigator.getBattery`, feature-detected — never a user-agent check)
 * the real level picks 3 / 2 / 1 bars. Anywhere else (e.g. iOS Safari), or if
 * the API rejects or misbehaves, the state stays 'fallback' and the icon looks
 * exactly as designed. The level never leaves this module: it is not rendered,
 * stored, logged or sent anywhere. No browser globals are touched at import
 * time, so this can move to a client-only component later unchanged.
 */
export type BatteryState = 'fallback' | 'high' | 'medium' | 'low';

/** The slice of BatteryManager this needs (the API is not in TypeScript's DOM lib). */
interface BatteryLike {
  level: number;
  addEventListener(type: 'levelchange', listener: () => void): void;
  removeEventListener(type: 'levelchange', listener: () => void): void;
}
type NavigatorWithBattery = { getBattery?: () => Promise<unknown> };

/** Whole-percent level → bucket: 66–100 high, 33–65 medium, 0–32 low (never zero bars). */
export function batteryStateForPercent(percent: number): Exclude<BatteryState, 'fallback'> {
  if (percent >= 66) return 'high';
  if (percent >= 33) return 'medium';
  return 'low';
}

/** BatteryManager.level (0…1) → bucket, or null if it is not a usable level. */
export function batteryStateForLevel(level: unknown): Exclude<BatteryState, 'fallback'> | null {
  if (typeof level !== 'number' || !Number.isFinite(level)) return null;
  return batteryStateForPercent(Math.round(Math.min(1, Math.max(0, level)) * 100));
}

const isBatteryLike = (b: unknown): b is BatteryLike =>
  typeof b === 'object' && b !== null && typeof (b as BatteryLike).addEventListener === 'function' && typeof (b as BatteryLike).removeEventListener === 'function' && batteryStateForLevel((b as BatteryLike).level) !== null;

/**
 * Follow the real battery bucket. `onChange` fires only when the bucket
 * changes (90 → 89 % is silent). Returns an unsubscribe that removes the
 * listener, even if called before getBattery() has resolved. Any failure
 * leaves the caller on its fallback.
 */
export function subscribeBattery(nav: NavigatorWithBattery | undefined, onChange: (state: Exclude<BatteryState, 'fallback'>) => void): () => void {
  let stopped = false;
  let cleanup = () => {};
  if (!nav || typeof nav.getBattery !== 'function') return () => {};
  let request: Promise<unknown>;
  try {
    request = nav.getBattery();
  } catch {
    return () => {};
  }
  Promise.resolve(request).then(
    (battery) => {
      if (stopped || !isBatteryLike(battery)) return;
      let last: BatteryState | null = null;
      const update = () => {
        const next = batteryStateForLevel(battery.level);
        if (next && next !== last) {
          last = next;
          onChange(next);
        }
      };
      battery.addEventListener('levelchange', update);
      cleanup = () => battery.removeEventListener('levelchange', update);
      update();
    },
    () => {},
  );
  return () => {
    stopped = true;
    cleanup();
  };
}

/** 'fallback' until (and unless) the real Battery Status API answers. */
export function useBatteryState(): BatteryState {
  const [state, setState] = useState<BatteryState>('fallback');
  useEffect(() => subscribeBattery(typeof navigator === 'undefined' ? undefined : (navigator as NavigatorWithBattery), setState), []);
  return state;
}
