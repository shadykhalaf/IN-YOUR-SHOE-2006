import { describe, expect, it } from 'vitest';
import { canReach, createTower, difficulty, pressure, reachable, stepTower, towerScore, WIDTH, worldAt, WORLDS, type TowerState } from '../games/tower/logic';

/** Generate floors far up the tower by moving the camera. */
function grow(st: TowerState, floors: number) {
  while (st.nextFloor < floors) {
    st.camera += 400;
    stepTower(st, 0, 0);
    st.over = false;
  }
}

/** Autopilot: steer toward the lowest platform above the last landing. */
function bot(st: TowerState): -1 | 0 | 1 {
  const target = st.platforms.find((p) => p.floor === st.floor + 1) ?? st.platforms.find((p) => p.y > st.py + 1);
  if (!target) return 0;
  const dx = target.x - st.px;
  return Math.abs(dx) < 6 ? 0 : dx > 0 ? 1 : -1;
}

describe('IYS TOWER rules', () => {
  it('every generated platform is reachable from the one below (many seeds, deep floors)', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const st = createTower(seed);
      const all = [...st.platforms];
      let last = all[all.length - 1]!.floor;
      while (last < 160) {
        st.camera += 300;
        stepTower(st, 0, 0);
        st.over = false;
        for (const p of st.platforms) if (p.floor > last) all.push(p), (last = p.floor);
      }
      for (let i = 1; i < all.length; i++) {
        const a = all[i - 1]!;
        const b = all[i]!;
        expect(b.floor).toBe(a.floor + 1);
        expect(b.y - a.y).toBeGreaterThan(0);
        expect(reachable(a, b)).toBe(true);
        expect(b.min).toBeGreaterThanOrEqual(b.w / 2 - 0.001);
        expect(b.max).toBeLessThanOrEqual(WIDTH - b.w / 2 + 0.001);
      }
    }
  });

  it('canReach rejects jumps that are too high or too far', () => {
    expect(canReach(180, 80, 180, 100)).toBe(true);
    expect(canReach(180, 260, 180, 100)).toBe(false);
    expect(canReach(30, 140, 340, 40)).toBe(false);
  });

  it('a steering bot climbs through the worlds with the real step function', () => {
    for (const seed of [3, 7, 11]) {
      const st = createTower(seed);
      for (let i = 0; i < 60 * 120 && !st.over && st.best < 110; i++) stepTower(st, 1 / 60, bot(st));
      expect(st.best).toBeGreaterThanOrEqual(100);
      expect(worldAt(st.best)).toBe(WORLDS.length - 1);
    }
  });

  it('auto-bounces: Catchy never needs a jump button', () => {
    const st = createTower(2);
    const ys: number[] = [];
    for (let i = 0; i < 180; i++) {
      stepTower(st, 1 / 60, 0);
      ys.push(st.py);
    }
    expect(Math.max(...ys)).toBeGreaterThan(100);
  });

  it('falling below the camera ends the run; pressure kicks in and rises', () => {
    const st = createTower(4);
    expect(pressure(0, 0)).toBe(0);
    expect(pressure(60, 40)).toBeGreaterThan(pressure(10, 5));
    let ev: string[] = [];
    for (let i = 0; i < 60 * 60 && !st.over; i++) ev = stepTower(st, 1 / 60, 1);
    expect(st.over).toBe(true);
    expect(ev).toContain('over');
  });

  it('multi-floor jumps chain into a combo bonus; difficulty ramps', () => {
    const st = createTower(5);
    grow(st, 10);
    st.lastFloor = 0;
    const plat = (f: number) => st.platforms.find((p) => p.floor === f)!;
    const land = (f: number) => {
      const p = plat(f);
      Object.assign(st, { px: p.x, py: p.y + 0.1, vy: -10, vx: 0, camera: p.y - 100 });
      p.speed = 0;
      return stepTower(st, 1 / 120, 0);
    };
    land(2);
    land(4);
    land(7);
    const ev = land(8);
    expect(ev).toContain('combo');
    expect(st.bonus).toBe(7 * 7);
    expect(towerScore(st)).toBe(st.best * 10 + 49);
    const d0 = difficulty(0);
    const d1 = difficulty(140);
    expect(d1.maxW).toBeLessThan(d0.maxW);
    expect(d1.maxGap).toBeGreaterThan(d0.maxGap);
    expect(d1.moveChance).toBeGreaterThan(0);
    expect(d0.moveChance).toBe(0);
  });
});
