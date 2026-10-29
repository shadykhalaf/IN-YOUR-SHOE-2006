import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** Longest step a frame may simulate (s): a background tab or a slow frame never teleports the game. */
export const MAX_DT = 1 / 20;

/**
 * requestAnimationFrame loop with delta time, only while `running`.
 * Stops (and cancels its frame) on pause, unmount or `running = false`.
 */
export function useRaf(step: (dt: number) => void, running: boolean) {
  const cb = useRef(step);
  cb.current = step;
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = -1;
    const frame = (t: number) => {
      const dt = last < 0 ? 0 : Math.min((t - last) / 1000, MAX_DT);
      last = t;
      cb.current(dt);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}

/** Fixed-step accumulator: calls `tick` every `interval` seconds of game time. */
export function makeTicker() {
  let acc = 0;
  return (dt: number, interval: number, tick: () => void | boolean) => {
    acc += dt;
    let guard = 0;
    while (acc >= interval && guard++ < 8) {
      acc -= interval;
      if (tick() === false) {
        acc = 0;
        break;
      }
    }
  };
}

/**
 * A canvas that keeps a fixed virtual resolution (w × h game units), letterboxed
 * to fit its wrapper and sharp on high-DPI screens. `ctx()` returns a context
 * already scaled to game units. `onResize` lets a paused game redraw.
 */
export function useGameCanvas(w: number, h: number, onResize?: () => void): { wrap: RefObject<HTMLDivElement | null>; canvas: RefObject<HTMLCanvasElement | null>; ctx: () => CanvasRenderingContext2D | null } {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scale = useRef(1);
  const resize = useRef(onResize);
  resize.current = onResize;
  const [, bump] = useState(0);
  useLayoutEffect(() => {
    const el = wrap.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const fit = () => {
      const bw = el.clientWidth;
      const bh = el.clientHeight;
      if (!bw || !bh) return;
      const s = Math.min(bw / w, bh / h);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.style.width = `${Math.floor(w * s)}px`;
      cv.style.height = `${Math.floor(h * s)}px`;
      cv.width = Math.floor(w * s * dpr);
      cv.height = Math.floor(h * s * dpr);
      scale.current = s * dpr;
      resize.current?.();
      bump((n) => n + 1);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    return () => ro.disconnect();
  }, [w, h]);
  return {
    wrap,
    canvas,
    ctx: () => {
      const c = canvas.current?.getContext('2d') ?? null;
      if (c) {
        c.setTransform(scale.current, 0, 0, scale.current, 0, 0);
        c.imageSmoothingEnabled = true;
      }
      return c;
    },
  };
}
