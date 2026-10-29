import { describe, expect, it, vi } from 'vitest';
import { canWave, createBrain, cursorNear, nextIdle, react, TIMING, type Ctx } from '../features/catchy/behaviour';
import { createEmitter, notifyCatchy, catchyEvents } from '../features/catchy/events';
import { BANNED, bagKind, LINES } from '../features/catchy/lines';
import { besideRect, clampTo, DESKTOP_SIZE, legalBounds, MAX_STEP, restSpot, stepToward, visibleFraction, wanderTarget } from '../features/catchy/movement';
import { CATCHY_KEYS, readEnabled, readPosition, writeEnabled, writePosition } from '../features/catchy/storage';
import { makeRng } from '../games/shared/rng';
import type { SyncStorage } from '../state/storage';

const ctx = (now: number, over: Partial<Ctx> = {}): Ctx => ({ now, rng: makeRng(7), reducedMotion: false, hidden: false, enabled: true, quiet: false, ...over });
const mem = (): SyncStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
};

describe('Catchy behaviour', () => {
  it('inactivity leads to sitting, then sleep', () => {
    const b = createBrain(0, 'idle');
    expect(nextIdle(b, ctx(5_000))!.state).not.toBe('sleep');
    expect(nextIdle(b, ctx(TIMING.sitMs + 1))!.state).toBe('sit');
    expect(nextIdle(b, ctx(TIMING.sleepMs + 1))).toMatchObject({ state: 'sleep', symbol: 'zzz' });
    // stays asleep on its own
    expect(nextIdle(b, ctx(TIMING.sleepMs + 60_000))!.state).toBe('sleep');
  });

  it('meaningful events wake him; cursor movement alone does not', () => {
    const b = createBrain(0, 'idle');
    nextIdle(b, ctx(TIMING.sleepMs + 1));
    expect(cursorNear(b, 10, ctx(TIMING.sleepMs + 2))).toEqual({ look: false, step: false });
    expect(b.state).toBe('sleep');
    expect(react(b, { type: 'poke' }, ctx(TIMING.sleepMs + 3))!.state).toBe('wake');
    nextIdle(b, ctx(TIMING.sleepMs * 3));
    expect(b.state).toBe('sleep');
    expect(react(b, { type: 'bag:add', kind: 'other' }, ctx(TIMING.sleepMs * 3 + 1))!.state).toBe('excited');
    expect(nextIdle(b, ctx(TIMING.sleepMs * 3 + 2))!.state).not.toBe('sleep');
  });

  it('bag add: excited reaction with product-aware lines, and a speech cooldown', () => {
    const b = createBrain(0, 'idle');
    const a = react(b, { type: 'bag:add', kind: 'pjoy' }, ctx(1_000))!;
    expect(a).toMatchObject({ state: 'carry-pjoy', symbol: '!!', move: { pace: 'run', to: 'visible' } });
    expect(LINES.pjoy).toContain(a.say);
    // a second add right away: still reacts (!!), but no new bubble
    const again = react(b, { type: 'bag:add', kind: 'socks' }, ctx(3_000))!;
    expect(again).toMatchObject({ state: 'carry-sock', symbol: '!!' });
    expect(again.say).toBeUndefined();
    expect(react(b, { type: 'bag:add', kind: 'socks' }, ctx(1_000 + TIMING.bagSpeechCooldownMs + 1))!.say).toBeDefined();
    expect(react(b, { type: 'bag:add', kind: 'other' }, ctx(90_000))!.state).toBe('excited');
  });

  it('idle chatter is rare: one bubble per cooldown, never while quiet or hidden', () => {
    const b = createBrain(0, 'idle');
    const always = { rng: () => 0.05 };
    let said = 0;
    for (let t = 0; t < TIMING.idleSpeechCooldownMs * 3; t += 5_000) {
      b.lastActive = t; // keep him awake
      if (nextIdle(b, ctx(t, always))?.say) said++;
    }
    expect(said).toBeLessThanOrEqual(3);
    const q = createBrain(0, 'idle');
    q.lastIdleSpeech = -Infinity;
    expect(nextIdle(q, ctx(200_000 - 100_000, { ...always, quiet: true }))?.say).toBeUndefined();
    expect(nextIdle(q, ctx(1, { hidden: true }))).toBeNull();
  });

  it('cursor: looks, occasionally steps, never a permanent chase', () => {
    const b = createBrain(0, 'idle');
    let steps = 0;
    for (let t = 0; t < 60_000; t += 100) if (cursorNear(b, 100, ctx(t, { rng: () => 0 })).step) steps++;
    expect(steps).toBeLessThanOrEqual(Math.ceil(60_000 / TIMING.cursorStepCooldownMs));
    expect(cursorNear(b, 500, ctx(70_000)).look).toBe(false);
    expect(cursorNear(b, 100, ctx(80_000)).look).toBe(true);
  });

  it('reduced motion: no roaming, no running, reactions stay in place', () => {
    const b = createBrain(0, 'idle');
    for (let i = 0; i < 200; i++) {
      b.lastActive = i * 1000;
      expect(nextIdle(b, ctx(i * 1000, { reducedMotion: true, rng: makeRng(i) }))!.move).toBeUndefined();
    }
    expect(react(b, { type: 'bag:add', kind: 'socks' }, ctx(1, { reducedMotion: true }))!.move).toBeUndefined();
    expect(cursorNear(b, 100, ctx(999_999, { reducedMotion: true, rng: () => 0 })).step).toBe(false);
    expect(canWave({ enabled: true, hidden: false, reducedMotion: true }, true)).toBe(false);
  });

  it('hidden tab or disabled Catchy: no behaviour at all', () => {
    const b = createBrain(0, 'idle');
    expect(nextIdle(b, ctx(1, { hidden: true }))).toBeNull();
    expect(nextIdle(b, ctx(1, { enabled: false }))).toBeNull();
    expect(react(b, { type: 'bag:add', kind: 'pjoy' }, ctx(1, { enabled: false }))).toBeNull();
    expect(cursorNear(b, 10, ctx(1, { enabled: false })).look).toBe(false);
    expect(canWave({ enabled: false, hidden: false, reducedMotion: false }, true)).toBe(false);
  });

  it('games → playful; Real IYS → wave; wave only when it can be seen', () => {
    const b = createBrain(0, 'idle');
    expect(react(b, { type: 'games:open' }, ctx(1))!.state).toBe('happy');
    expect(b.mood).toBe('playful');
    expect(react(b, { type: 'real-iys:leave' }, ctx(10_000))).toMatchObject({ state: 'wave' });
    expect(LINES.leave).toContain(react(createBrain(0), { type: 'real-iys:leave' }, ctx(10))!.say);
    expect(canWave({ enabled: true, hidden: false, reducedMotion: false }, true)).toBe(true);
    expect(canWave({ enabled: true, hidden: true, reducedMotion: false }, true)).toBe(false);
    expect(canWave({ enabled: true, hidden: false, reducedMotion: false }, false)).toBe(false);
  });

  it('lines: short, hand-written, never salesy', () => {
    const all = Object.values(LINES).flat();
    expect(all.length).toBeGreaterThanOrEqual(20);
    expect(all.length).toBeLessThanOrEqual(40);
    for (const l of all) {
      expect(l.length).toBeLessThanOrEqual(24);
      expect(l).not.toMatch(BANNED);
    }
    expect(bagKind('cereal-killer-pjoys')).toBe('pjoy');
    expect(bagKind('i-love-cairo-neck-socks')).toBe('socks');
    expect(bagKind('dropout-oversized-hoodie', 'Dropout Oversized Hoodie')).toBe('other');
  });
});

describe('Catchy movement', () => {
  const desk = { w: 1440, h: 844 };
  const b = legalBounds(desk, DESKTOP_SIZE);

  it('targets stay inside the desktop: never under the taskbar or the REAL IYS strip', () => {
    const rng = makeRng(3);
    for (let i = 0; i < 500; i++) {
      const t = wanderTarget(b, DESKTOP_SIZE, { x: rng() * 2000 - 300, y: rng() * 1200 - 200 }, rng);
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeGreaterThanOrEqual(0); // below the strip (desk y 0 = under it)
      expect(t.x + DESKTOP_SIZE.w).toBeLessThanOrEqual(desk.w);
      expect(t.y + DESKTOP_SIZE.h).toBeLessThanOrEqual(desk.h); // above the taskbar
    }
  });

  it('drops clamp on-screen, resize re-clamps, junk never escapes', () => {
    expect(clampTo({ x: -500, y: -40 }, b)).toEqual({ x: 0, y: 0 });
    expect(clampTo({ x: 99_999, y: 99_999 }, b)).toEqual({ x: b.w, y: b.h });
    expect(clampTo({ x: Number.NaN, y: Number.POSITIVE_INFINITY }, b)).toEqual({ x: b.w, y: b.h });
    const small = legalBounds({ w: 1024, h: 712 }, DESKTOP_SIZE);
    const p = clampTo({ x: 1300, y: 760 }, small);
    expect(p.x + DESKTOP_SIZE.w).toBeLessThanOrEqual(1024);
    expect(p.y + DESKTOP_SIZE.h).toBeLessThanOrEqual(712);
    expect(legalBounds({ w: 40, h: 40 }, DESKTOP_SIZE)).toEqual({ x: 0, y: 0, w: 0, h: 0 });
  });

  it('zero / huge deltas never teleport; movement stops at the target', () => {
    const from = { x: 100, y: 100 };
    const to = { x: 900, y: 100 };
    expect(stepToward(from, to, 46, 0).pos).toEqual(from);
    const huge = stepToward(from, to, 46, 600);
    expect(huge.pos.x - from.x).toBeCloseTo(46 * MAX_STEP);
    expect(stepToward(from, to, 46, Number.NaN).pos).toEqual(from);
    let p = from;
    let arrived = false;
    for (let i = 0; i < 1000 && !arrived; i++) ({ pos: p, arrived } = stepToward(p, to, 120, 0.05));
    expect(arrived).toBe(true);
    expect(p).toEqual(to);
    expect(stepToward(from, to, 46, 0.016).dir).toBe(1);
  });

  it('rest spot: along the bottom, out from under windows, off the icons', () => {
    const win = { x: 187, y: 12, w: 1066, h: 760 };
    const icons = [{ x: 1340, y: 8, w: 90, h: 820 }];
    const s = restSpot(b, DESKTOP_SIZE, [win], icons);
    const r = { ...s, ...DESKTOP_SIZE };
    expect(s.y + DESKTOP_SIZE.h).toBeLessThanOrEqual(desk.h);
    expect(s.y).toBeGreaterThan(desk.h - DESKTOP_SIZE.h - 40);
    expect(visibleFraction(r, [win])).toBeGreaterThan(0.6);
    expect(r.x + r.w <= 1340 || r.x >= 1430).toBe(true);
    expect(restSpot(b, DESKTOP_SIZE, [win], icons)).toEqual(s); // deterministic
    const bag = { x: 1000, y: 300, w: 400, h: 540 };
    const near = besideRect(b, DESKTOP_SIZE, bag);
    expect(near.x + DESKTOP_SIZE.w).toBeLessThanOrEqual(bag.x);
  });
});

describe('Catchy storage', () => {
  it('enabled by default; on/off persists', () => {
    const s = mem();
    expect(readEnabled(s)).toBe(true);
    writeEnabled(false, s);
    expect(s.data.get(CATCHY_KEYS.enabled)).toBe('false');
    expect(readEnabled(s)).toBe(false);
    writeEnabled(true, s);
    expect(readEnabled(s)).toBe(true);
  });

  it('position persists as safe fractions; corrupt values fall back', () => {
    const s = mem();
    writePosition({ fx: 0.25, fy: 1.7 }, s);
    expect(readPosition(s)).toEqual({ fx: 0.25, fy: 1 });
    for (const bad of ['{', '"x"', '{"fx":-1,"fy":0.5}', '{"fx":"0.2","fy":0.5}', 'null', '{}']) {
      s.data.set(CATCHY_KEYS.position, bad);
      expect(readPosition(s)).toBeNull();
    }
  });

  it('storage failure never crashes', () => {
    const broken: SyncStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {},
    };
    expect(readEnabled(broken)).toBe(true);
    expect(readPosition(broken)).toBeNull();
    expect(() => writeEnabled(false, broken)).not.toThrow();
    expect(() => writePosition({ fx: 0.5, fy: 0.5 }, broken)).not.toThrow();
  });
});

describe('Catchy events', () => {
  it('fire-and-forget: a throwing listener never breaks the caller; cleanup works', () => {
    const em = createEmitter<{ type: string }>();
    const seen: string[] = [];
    const off1 = em.on(() => {
      throw new Error('mascot broke');
    });
    const off2 = em.on((e) => void seen.push(e.type));
    expect(() => em.emit({ type: 'bag:add' })).not.toThrow();
    expect(seen).toEqual(['bag:add']);
    off1();
    off2();
    expect(em.size).toBe(0);
    em.emit({ type: 'games:open' });
    expect(seen).toEqual(['bag:add']);
  });

  it('nobody listening (Catchy disabled) → nothing shown, nothing waits', () => {
    expect(catchyEvents.size).toBe(0);
    expect(notifyCatchy({ type: 'real-iys:leave' })).toBe(false);
    const off = catchyEvents.on((e) => e.type === 'real-iys:leave');
    expect(notifyCatchy({ type: 'real-iys:leave' })).toBe(true);
    expect(notifyCatchy({ type: 'games:open' })).toBe(false);
    off();
  });

  it('never touches the network', () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    const b = createBrain(0);
    react(b, { type: 'bag:add', kind: 'pjoy' }, ctx(1));
    nextIdle(b, ctx(2));
    notifyCatchy({ type: 'games:open' });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
