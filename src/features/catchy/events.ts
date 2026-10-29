import type { CatchyEvent } from './types';

type Listener<E> = (e: E) => boolean | void;

/**
 * A tiny typed emitter. Emitting never throws and never waits: Catchy is
 * decoration, so a failing or missing listener can't touch the business action.
 * `emit` returns true when a listener says it is reacting visibly (e.g. a wave).
 */
export function createEmitter<E>() {
  const listeners = new Set<Listener<E>>();
  return {
    on(fn: Listener<E>) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    emit(e: E): boolean {
      let shown = false;
      for (const fn of [...listeners]) {
        try {
          if (fn(e) === true) shown = true;
        } catch {
          // a mascot problem is never a site problem
        }
      }
      return shown;
    },
    get size() {
      return listeners.size;
    },
  };
}

/** Longest REAL IYS hand-off delay for a visible goodbye wave (ms). */
export const WAVE_DELAY_MS = 280;

export const catchyEvents = createEmitter<CatchyEvent>();

/** Fire-and-forget helper for the rest of the app. */
export function notifyCatchy(e: CatchyEvent): boolean {
  try {
    return catchyEvents.emit(e);
  } catch {
    return false;
  }
}
