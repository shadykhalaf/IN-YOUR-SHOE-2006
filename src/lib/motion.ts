import { useEffect, useState } from 'react';

const query = '(prefers-reduced-motion: reduce)';

export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.(query).matches === true;

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

export function useMediaQuery(q: string): boolean {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return match;
}

/** Deterministic mode for /showcase rendering and screenshot QA (?still=1). */
export const isStill = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('still');
