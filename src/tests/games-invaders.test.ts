import { describe, expect, it } from 'vitest';
import { createInvaders, fire, fireDelay, PLAYER_Y, stepInvaders, W, WAVE_DEFS, WAVES, type InvState } from '../games/invaders/logic';

const quiet = (st: InvState) => {
  st.bombs = [];
  st.rng = () => 0.99; // no random fire, no lucky drops
};

describe('CATCHY INVADERS rules', () => {
  it('5 waves; wave 5 is a single original boss; no chickens anywhere', () => {
    expect(WAVES).toBe(5);
    expect(WAVE_DEFS).toHaveLength(5);
    expect(WAVE_DEFS[4]!.rows).toEqual(['boss']);
    const kinds = new Set(WAVE_DEFS.flatMap((d) => d.rows));
    expect([...kinds].sort()).toEqual(['blob', 'boss', 'closet', 'sock', 'tag']);
    const boss = createInvaders(1, 5);
    expect(boss.foes).toHaveLength(1);
    expect(boss.foes[0]!.kind).toBe('boss');
  });

  it('moves left/right inside the screen', () => {
    const st = createInvaders(1);
    quiet(st);
    for (let i = 0; i < 200; i++) stepInvaders(st, 1 / 60, -1, false);
    expect(st.px).toBe(22);
    for (let i = 0; i < 300; i++) stepInvaders(st, 1 / 60, 1, false);
    expect(st.px).toBe(W - 22);
  });

  it('fire has a cooldown; SOCK = faster fire, PJOY = triple shot', () => {
    const st = createInvaders(1);
    expect(fire(st)).toBe(true);
    expect(fire(st)).toBe(false);
    expect(st.shots).toHaveLength(1);
    expect(fireDelay({ rapid: 5 })).toBeLessThan(fireDelay({ rapid: 0 }));
    st.cooldown = 0;
    st.multi = 5;
    fire(st);
    expect(st.shots).toHaveLength(4);
  });

  it('a shot hits a foe, scores and removes it', () => {
    const st = createInvaders(2);
    quiet(st);
    const f = st.foes[0]!;
    st.shots.push({ x: f.x, y: f.y + 2, vx: 0, vy: 0 });
    const n = st.foes.length;
    const ev = stepInvaders(st, 1 / 1000, 0, false);
    expect(ev).toContain('kill');
    expect(st.foes).toHaveLength(n - 1);
    expect(st.score).toBe(10);
  });

  it('power-ups drop mid-wave and are picked up', () => {
    const st = createInvaders(3);
    quiet(st);
    st.powers.push({ kind: 'pjoy', x: st.px, y: PLAYER_Y });
    expect(stepInvaders(st, 1 / 60, 0, false)).toContain('power');
    expect(st.multi).toBeGreaterThan(0);
    st.powers.push({ kind: 'sock', x: st.px, y: PLAYER_Y });
    stepInvaders(st, 1 / 60, 0, false);
    expect(st.rapid).toBeGreaterThan(0);
    // half the wave down guarantees a drop
    const half = Math.ceil(st.foes.length / 2);
    for (let i = 0; i < half; i++) {
      const f = st.foes[0]!;
      st.shots.push({ x: f.x, y: f.y, vx: 0, vy: 0 });
      stepInvaders(st, 1 / 1000, 0, false);
    }
    expect(st.powers.length).toBeGreaterThan(0);
  });

  it('enemy projectiles cost a life, then brief invulnerability; 0 lives = game over', () => {
    const st = createInvaders(4);
    quiet(st);
    st.bombs.push({ x: st.px, y: PLAYER_Y, vx: 0, vy: 0 });
    expect(stepInvaders(st, 1 / 60, 0, false)).toContain('hurt');
    expect(st.lives).toBe(2);
    st.bombs.push({ x: st.px, y: PLAYER_Y, vx: 0, vy: 0 });
    stepInvaders(st, 1 / 60, 0, false);
    expect(st.lives).toBe(2);
    st.invuln = 0;
    st.lives = 1;
    st.bombs.push({ x: st.px, y: PLAYER_Y, vx: 0, vy: 0 });
    expect(stepInvaders(st, 1 / 60, 0, false)).toContain('over');
    expect(st.over).toBe(true);
  });

  it('clearing a wave → NEXT WAVE intermission → next wave; boss arrives at wave 5', () => {
    const st = createInvaders(5, 4);
    quiet(st);
    st.foes = [];
    expect(stepInvaders(st, 1 / 60, 0, false)).toContain('wave');
    let ev: string[] = [];
    for (let i = 0; i < 200 && st.wave === 4; i++) ev = stepInvaders(st, 1 / 60, 0, false);
    expect(st.wave).toBe(5);
    expect(ev).toContain('boss');
  });

  it('defeating the boss wins the game with a lives bonus', () => {
    const st = createInvaders(6, 5);
    quiet(st);
    const boss = st.foes[0]!;
    boss.hp = 1;
    st.shots.push({ x: boss.x, y: boss.y, vx: 0, vy: 0 });
    stepInvaders(st, 1 / 1000, 0, false);
    const ev = stepInvaders(st, 1 / 1000, 0, false);
    expect(st.won || ev.includes('win')).toBe(true);
    expect(st.over).toBe(true);
    expect(st.score).toBeGreaterThanOrEqual(2000 + 3 * 500);
  });

  it('a formation that reaches Catchy ends the game', () => {
    const st = createInvaders(7);
    quiet(st);
    st.oy = PLAYER_Y;
    let ev: string[] = [];
    for (let i = 0; i < 60 && !st.over; i++) ev = stepInvaders(st, 1 / 60, 0, false);
    expect(ev).toContain('over');
  });
});
