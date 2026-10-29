import { describe, expect, it } from 'vitest';
import { createChomp, distances, enemyTarget, LIVES, MAZES, open, parseMaze, PJOY, pos, SOCK, stepChomp, type ChompState } from '../games/chomp/logic';

const run = (st: ChompState, secs: number, step = 1 / 60) => {
  const ev: string[] = [];
  for (let t = 0; t < secs; t += step) ev.push(...stepChomp(st, step));
  return ev;
};
const calm = (st: ChompState) => st.enemies.forEach((e) => (e.release = 9999));

describe('CATCHY CHOMP mazes', () => {
  it('three distinct, closed, completable mazes', () => {
    expect(MAZES).toHaveLength(3);
    expect(new Set(MAZES.map((m) => m.rows.join('\n'))).size).toBe(3);
    for (const m of MAZES) {
      const p = parseMaze(m.rows);
      expect(new Set(m.rows.map((r) => r.length)).size).toBe(1);
      // closed border
      for (let x = 0; x < p.w; x++) expect(p.walls[x] && p.walls[(p.h - 1) * p.w + x]).toBe(true);
      const d = distances(p, p.start.x, p.start.y);
      for (const i of p.pickups.keys()) expect(d[i]).toBeGreaterThan(-1);
      for (const h of p.homes) expect(d[h.y * p.w + h.x]).toBeGreaterThan(-1);
      expect(p.homes).toHaveLength(4);
      expect([...p.pickups.values()].filter((v) => v === 'pjoy')).toHaveLength(4);
      expect(p.pickups.size).toBeGreaterThan(100);
    }
  });
});

describe('CATCHY CHOMP rules', () => {
  it('grid movement: Catchy walks corridors and stops at walls', () => {
    const st = createChomp(1);
    calm(st);
    st.freeze = 0;
    st.want = 'left';
    run(st, 3);
    expect(st.player.t).toBe(0);
    expect(st.player.moving).toBe(false);
    expect(open(st, st.player.x - 1, st.player.y)).toBe(false);
    expect(st.player.x).toBe(1);
  });

  it('eating socks scores and removes them', () => {
    const st = createChomp(1);
    calm(st);
    st.freeze = 0;
    const before = st.pickups.size;
    st.want = 'right';
    const ev = run(st, 0.5);
    expect(ev).toContain('sock');
    expect(st.pickups.size).toBeLessThan(before);
    expect(st.score).toBe((before - st.pickups.size) * SOCK);
  });

  it('a Pjoy scares the enemies; Catchy can then eat them for combo points', () => {
    const st = createChomp(1);
    st.freeze = 0;
    const i = st.player.y * st.w + st.player.x + 1;
    st.pickups.set(i, 'pjoy');
    st.enemies.forEach((e) => (e.release = 0));
    st.want = 'right';
    run(st, 0.3);
    expect(st.score).toBeGreaterThanOrEqual(PJOY);
    expect(st.power).toBeGreaterThan(0);
    const e = st.enemies[0]!;
    expect(e.mode).toBe('scared');
    st.player.t = 0;
    st.want = null;
    Object.assign(e, { x: st.player.x, y: st.player.y, t: 0 });
    const ev = stepChomp(st, 1 / 60);
    expect(ev).toContain('eat');
    expect(e.mode).toBe('eaten');
  });

  it('touching an enemy costs a life and resets; no lives = game over', () => {
    const st = createChomp(2);
    st.freeze = 0;
    const e = st.enemies[0]!;
    e.release = 0;
    e.mode = 'chase';
    Object.assign(e, { x: st.player.x, y: st.player.y, t: 0 });
    expect(stepChomp(st, 1 / 60)).toContain('hit');
    expect(st.lives).toBe(LIVES - 1);
    expect(st.freeze).toBeGreaterThan(0);
    st.lives = 1;
    st.freeze = 0;
    Object.assign(e, { x: st.player.x, y: st.player.y, t: 0, mode: 'chase', release: 0 });
    expect(stepChomp(st, 1 / 60)).toContain('over');
    expect(st.over).toBe(true);
  });

  it('clearing every pickup moves to the next maze, then the next', () => {
    const st = createChomp(3);
    calm(st);
    st.freeze = 0;
    st.pickups = new Map([[st.player.y * st.w + st.player.x, 'sock']]);
    expect(stepChomp(st, 1 / 60)).toContain('clear');
    expect([st.level, st.maze]).toEqual([2, 1]);
    st.freeze = 0;
    calm(st);
    st.pickups = new Map([[st.player.y * st.w + st.player.x, 'sock']]);
    stepChomp(st, 1 / 60);
    expect(st.maze).toBe(2);
  });

  it('the four enemies behave differently', () => {
    const st = createChomp(4);
    const [lint, sock, gremlin, bug] = st.enemies;
    for (const e of st.enemies) e.mode = 'chase';
    st.player.dir = 'right';
    expect(enemyTarget(st, lint!)).toEqual(st.player);
    expect(enemyTarget(st, sock!)).toBeNull();
    expect(enemyTarget(st, gremlin!)).toEqual({ x: st.player.x + 4, y: st.player.y });
    Object.assign(bug!, { x: st.player.x + 1, y: st.player.y });
    expect(enemyTarget(st, bug!)).toEqual({ x: 1, y: st.h - 2 });
    // the lint monster closes in on Catchy over time
    const d0 = distances(st, st.player.x, st.player.y);
    st.freeze = 0;
    st.player = { ...st.player, moving: false };
    st.want = null;
    for (const e of st.enemies) e.release = e === lint ? 0 : 9999;
    const start = d0[lint!.y * st.w + lint!.x]!;
    for (let k = 0; k < 30 && !st.over && st.lives === LIVES; k++) stepChomp(st, 1 / 30);
    const [lx, ly] = pos(lint!);
    expect(st.lives < LIVES || d0[Math.round(ly) * st.w + Math.round(lx)]! < start).toBe(true);
  });
});
