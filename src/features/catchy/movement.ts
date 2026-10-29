import type { Rng } from '../../games/shared/rng';
import type { Rect, Vec } from './types';

/**
 * Where Catchy may be. Coordinates are relative to the desktop work area,
 * which already sits below the REAL IYS strip and above the taskbar, so
 * "inside the bounds" means never under either.
 */
export const DESKTOP_SIZE = { w: 76, h: 80 } as const;
export const MOBILE_SIZE = { w: 52, h: 56 } as const;
export const SPEED = { walk: 46, run: 120 } as const; // px / s
/** Longest step simulated in one frame (s): a slow frame or a returning tab never teleports him. */
export const MAX_STEP = 0.1;

export interface Size {
  w: number;
  h: number;
}

/** Legal top-left positions for a pet of `size` inside an area of `area` (w × h). */
export function legalBounds(area: Size, size: Size): Rect {
  return { x: 0, y: 0, w: Math.max(0, area.w - size.w), h: Math.max(0, area.h - size.h) };
}

export function clampTo(p: Vec, b: Rect): Vec {
  const fix = (v: number, lo: number, span: number) => (Number.isFinite(v) ? Math.min(lo + span, Math.max(lo, v)) : lo + span);
  return { x: fix(p.x, b.x, b.w), y: fix(p.y, b.y, b.h) };
}

/** Advance toward a target at a fixed speed; dt is clamped so nothing jumps. */
export function stepToward(p: Vec, target: Vec, speed: number, dt: number): { pos: Vec; arrived: boolean; dir: -1 | 0 | 1 } {
  const t = Math.min(MAX_STEP, Math.max(0, Number.isFinite(dt) ? dt : 0));
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const dist = Math.hypot(dx, dy);
  const dir = dx > 0.5 ? 1 : dx < -0.5 ? -1 : 0;
  const step = speed * t;
  if (dist <= step || dist < 0.5) return { pos: { ...target }, arrived: true, dir };
  return { pos: { x: p.x + (dx / dist) * step, y: p.y + (dy / dist) * step }, arrived: false, dir };
}

export const overlap = (a: Rect, b: Rect) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/** Share of `r` not covered by any of `covers` (approximate: overlaps are summed, capped at 1). */
export function visibleFraction(r: Rect, covers: Rect[]): number {
  const area = r.w * r.h || 1;
  return Math.max(0, 1 - Math.min(1, covers.reduce((s, c) => s + overlap(r, c), 0) / area));
}

/**
 * A random spot to walk to: inside the bounds, not resting on a desktop
 * icon, and not further than `reach` px away (so walks stay short).
 */
export function wanderTarget(b: Rect, size: Size, from: Vec, rng: Rng, avoid: Rect[] = [], reach = 260): Vec {
  let best: Vec = clampTo(from, b);
  let bestScore = -Infinity;
  for (let i = 0; i < 14; i++) {
    const c = clampTo({ x: from.x + (rng() * 2 - 1) * reach, y: from.y + (rng() * 2 - 1) * reach * 0.35 }, b);
    const r = { ...c, ...size };
    const onIcon = avoid.reduce((s, a) => s + overlap(r, a), 0);
    const score = -onIcon - Math.abs(c.x - from.x) * 0.001 + (Math.abs(c.x - from.x) > 40 ? 50 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

/**
 * A calm resting spot along the bottom of the desktop: as visible as possible
 * (not under a window), never on a desktop icon, slightly preferring the
 * right-hand side. Deterministic for the same inputs.
 */
export function restSpot(b: Rect, size: Size, windows: Rect[] = [], icons: Rect[] = [], prefer: 'right' | 'left' = 'right'): Vec {
  const y = b.y + b.h - Math.min(14, b.h);
  let best: Vec = { x: b.x + (prefer === 'right' ? b.w * 0.75 : b.w * 0.25), y };
  let bestScore = -Infinity;
  for (let x = b.x; x <= b.x + b.w + 0.001; x += 12) {
    const r = { x, y, ...size };
    const vis = visibleFraction(r, windows);
    const onIcon = icons.some((i) => overlap(r, i) > 0) ? 1 : 0;
    const side = (prefer === 'right' ? x / Math.max(1, b.w) : 1 - x / Math.max(1, b.w)) * 0.15;
    const score = vis * 2 - onIcon * 3 + side;
    if (score > bestScore + 1e-9) {
      bestScore = score;
      best = { x, y };
    }
  }
  return clampTo(best, b);
}

/** A spot next to a window (e.g. MY BAG), outside it when there's room. */
export function besideRect(b: Rect, size: Size, target: Rect): Vec {
  const left = { x: target.x - size.w - 6, y: target.y + target.h - size.h };
  const right = { x: target.x + target.w + 6, y: target.y + target.h - size.h };
  const fits = (p: Vec) => p.x >= b.x && p.x <= b.x + b.w;
  return clampTo(fits(left) ? left : fits(right) ? right : left, b);
}
