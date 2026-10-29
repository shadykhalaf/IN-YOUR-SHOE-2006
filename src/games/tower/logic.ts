import { makeRng, type Rng } from '../shared/rng';

/**
 * IYS TOWER — pure rules of an endless vertical auto-jumper. World units:
 * x 0…WIDTH, height grows upward (y = feet height). Catchy bounces by itself
 * on every landing; the player only steers. Every platform is generated
 * reachable from the one below (checked by simulating a worst-case jump).
 */
export const WIDTH = 360;
export const VIEW_H = 540;
export const GRAVITY = 1500;
export const JUMP = 760;
export const ACCEL = 1900;
export const MAX_VX = 300;
export const HALF_W = 15;

export interface Platform {
  floor: number;
  /** centre x at spawn, and the movement range of the centre (equal for still platforms) */
  x: number;
  y: number;
  w: number;
  min: number;
  max: number;
  speed: number;
}
export interface TowerState {
  px: number;
  py: number;
  vx: number;
  vy: number;
  platforms: Platform[];
  nextFloor: number;
  topY: number;
  camera: number;
  scroll: number;
  time: number;
  floor: number;
  best: number;
  lastFloor: number;
  combo: number;
  comboFloors: number;
  bonus: number;
  over: boolean;
  rng: Rng;
}

export const WORLDS = [
  { from: 0, name: 'BEDROOM WARDROBE' },
  { from: 25, name: 'PJOY LAUNDRY ROOM' },
  { from: 50, name: 'CAIRO BALCONY' },
  { from: 75, name: 'LOCKER ROOM' },
  { from: 100, name: 'Y2K CATCHY SKY' },
] as const;
export const worldAt = (floor: number) => WORLDS.reduce((w, cur, i) => (floor >= cur.from ? i : w), 0);

/** Difficulty knobs by floor: platforms shrink, gaps widen, more of them move. */
export function difficulty(floor: number) {
  const k = Math.min(1, floor / 140);
  return {
    minGap: 60 + 20 * k,
    maxGap: 92 + 50 * k,
    minW: Math.round(110 - 50 * k),
    maxW: Math.round(170 - 70 * k),
    moveChance: floor < 20 ? 0 : Math.min(0.55, 0.12 + (floor - 20) * 0.006),
    moveSpeed: 40 + 70 * k,
  };
}

/**
 * Can Catchy, bouncing from (fromX, 0), steer onto a platform `dy` higher
 * centred at `toX` with width `w`? Simulated with the real physics, starting
 * from a standstill (worst case), no speed bonus.
 */
export function canReach(fromX: number, dy: number, toX: number, w: number): boolean {
  let x = fromX;
  let y = 0;
  let vx = 0;
  let vy = JUMP;
  const dt = 1 / 240;
  for (let i = 0; i < 2400; i++) {
    const dir = Math.sign(toX - x) * (Math.abs(toX - x) > 2 ? 1 : 0);
    vx = Math.max(-MAX_VX, Math.min(MAX_VX, dir ? vx + dir * ACCEL * dt : vx * 0.8));
    x = Math.max(HALF_W, Math.min(WIDTH - HALF_W, x + vx * dt));
    const prevY = y;
    vy -= GRAVITY * dt;
    y += vy * dt;
    if (vy < 0 && prevY >= dy && y <= dy) return Math.abs(x - toX) <= w / 2 - 4;
    if (vy < 0 && y < dy) return false;
  }
  return false;
}

/** Worst case over both platforms' whole movement ranges. */
export const reachable = (a: Platform, b: Platform) =>
  [a.min, a.max].every((ax) => [b.min, b.max].every((bx) => canReach(ax, b.y - a.y, bx, b.w)));

function makePlatform(st: TowerState, below: Platform): Platform {
  const floor = st.nextFloor;
  const d = difficulty(floor);
  const r = st.rng;
  const w = Math.round(d.minW + r() * (d.maxW - d.minW));
  let dy = d.minGap + r() * (d.maxGap - d.minGap);
  const moving = r() < d.moveChance;
  for (let attempt = 0; attempt < 12; attempt++) {
    const half = w / 2;
    const span = moving ? 50 + r() * 80 : 0;
    let x = half + r() * (WIDTH - 2 * half);
    const min = Math.max(half, x - span / 2);
    const max = Math.min(WIDTH - half, min + span);
    x = (min + max) / 2;
    const p: Platform = { floor, x, y: below.y + dy, w, min, max, speed: moving ? d.moveSpeed * (r() < 0.5 ? -1 : 1) : 0 };
    if (reachable(below, p)) return p;
    if (attempt > 5) dy = Math.max(d.minGap, dy * 0.85);
  }
  // fallback: a still platform right above the one below, always reachable
  const x = Math.max(w / 2, Math.min(WIDTH - w / 2, (below.min + below.max) / 2));
  return { floor, x, y: below.y + d.minGap, w, min: x, max: x, speed: 0 };
}

function extend(st: TowerState) {
  while (st.topY < st.camera + VIEW_H * 2) {
    const below = st.platforms[st.platforms.length - 1]!;
    const p = makePlatform(st, below);
    st.platforms.push(p);
    st.nextFloor++;
    st.topY = p.y;
  }
  // forget platforms far below the screen
  while (st.platforms.length > 2 && st.platforms[0]!.y < st.camera - 200) st.platforms.shift();
}

export function createTower(seed = 1): TowerState {
  const ground: Platform = { floor: 0, x: WIDTH / 2, y: 0, w: WIDTH, min: WIDTH / 2, max: WIDTH / 2, speed: 0 };
  const st: TowerState = { px: WIDTH / 2, py: 0, vx: 0, vy: JUMP, platforms: [ground], nextFloor: 1, topY: 0, camera: -60, scroll: 0, time: 0, floor: 0, best: 0, lastFloor: 0, combo: 0, comboFloors: 0, bonus: 0, over: false, rng: makeRng(seed) };
  extend(st);
  return st;
}

/** Camera pressure (units/s): starts after a few seconds, then keeps rising. */
export const pressure = (time: number, floor: number) => (time < 4 && floor < 5 ? 0 : Math.min(150, 26 + time * 0.9 + floor * 0.5));

export const towerScore = (st: Pick<TowerState, 'best' | 'bonus'>) => st.best * 10 + st.bonus;

export type TowerEvent = 'land' | 'combo' | 'world' | 'over';

function endCombo(st: TowerState, ev: TowerEvent[]) {
  if (st.combo >= 2) {
    st.bonus += st.comboFloors * st.comboFloors;
    ev.push('combo');
  }
  st.combo = 0;
  st.comboFloors = 0;
}

/** Advance by dt. `steer` = −1 left, 0 none, +1 right. */
export function stepTower(st: TowerState, dt: number, steer: -1 | 0 | 1): TowerEvent[] {
  const ev: TowerEvent[] = [];
  if (st.over) return ev;
  st.time += dt;
  for (const p of st.platforms)
    if (p.speed) {
      p.x += p.speed * dt;
      if (p.x < p.min) {
        p.x = p.min;
        p.speed = Math.abs(p.speed);
      } else if (p.x > p.max) {
        p.x = p.max;
        p.speed = -Math.abs(p.speed);
      }
    }
  if (steer) st.vx = Math.max(-MAX_VX, Math.min(MAX_VX, st.vx + steer * ACCEL * dt));
  else st.vx *= Math.pow(0.0015, dt);
  st.px += st.vx * dt;
  if (st.px < HALF_W) {
    st.px = HALF_W;
    st.vx = Math.abs(st.vx) * 0.6;
  } else if (st.px > WIDTH - HALF_W) {
    st.px = WIDTH - HALF_W;
    st.vx = -Math.abs(st.vx) * 0.6;
  }
  const prevY = st.py;
  st.vy -= GRAVITY * dt;
  st.py += st.vy * dt;
  if (st.vy < 0) {
    for (const p of st.platforms) {
      if (prevY >= p.y && st.py <= p.y && Math.abs(st.px - p.x) <= p.w / 2 + HALF_W * 0.5) {
        st.py = p.y;
        st.vy = JUMP + Math.abs(st.vx) * 0.35; // running start = higher bounce
        const prevWorld = worldAt(st.floor);
        const jumped = p.floor - st.lastFloor;
        if (jumped >= 2) {
          st.combo++;
          st.comboFloors += jumped;
        } else endCombo(st, ev);
        st.lastFloor = p.floor;
        st.floor = p.floor;
        st.best = Math.max(st.best, p.floor);
        if (worldAt(st.floor) > prevWorld) ev.push('world');
        ev.push('land');
        break;
      }
    }
  }
  st.scroll = pressure(st.time, st.best);
  st.camera = Math.max(st.camera + st.scroll * dt, st.py - VIEW_H * 0.45);
  extend(st);
  if (st.py < st.camera - 30) {
    endCombo(st, ev);
    st.over = true;
    ev.push('over');
  }
  return ev;
}
