import { useEffect, useRef } from 'react';

/** Press-and-hold auto-repeat for on-screen buttons (first fire now, then every `every` ms). Cleared on release and unmount. */
export function useHoldRepeat(delay = 170, every = 70) {
  const timer = useRef<number | null>(null);
  const stop = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  return {
    start: (fn: () => void) => {
      stop();
      fn();
      const loop = (ms: number) => {
        timer.current = window.setTimeout(() => {
          fn();
          loop(every);
        }, ms);
      };
      loop(delay);
    },
    stop,
  };
}
