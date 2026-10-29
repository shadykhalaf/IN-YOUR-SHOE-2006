import { describe, expect, it } from 'vitest';
import { checkLook, checkPack, closetPoints, closetRound, CLOSET, createPairs, flip, packBox, packCount, pairsScore, PAIRS, settle, SLOTS } from '../games/purbale/logic';
import { makeRng } from '../games/shared/rng';

describe('CATCHY CLOSET', () => {
  it('rounds get harder: more slots, more options, less time', () => {
    const r1 = closetRound(makeRng(1), 1);
    const r9 = closetRound(makeRng(1), 9);
    expect(r1.slots).toHaveLength(2);
    expect(r9.slots).toHaveLength(4);
    expect(r1.options.top).toHaveLength(3);
    expect(r9.options.top.length).toBeGreaterThan(3);
    expect(r9.time).toBeLessThan(r1.time);
  });

  it('the target is always among the offered options', () => {
    for (let n = 1; n <= 10; n++)
      for (let seed = 0; seed < 30; seed++) {
        const r = closetRound(makeRng(seed), n);
        for (const s of r.slots) expect(r.options[s]).toContain(r.target[s]);
        for (const s of SLOTS) for (const o of r.options[s]) expect(CLOSET[s]).toContain(o);
      }
  });

  it('checks the look and scores perfect rounds with a time bonus', () => {
    const r = closetRound(makeRng(3), 5);
    expect(checkLook(r, r.target).perfect).toBe(true);
    const wrong = { ...r.target, top: r.options.top.find((o) => o !== r.target.top) };
    expect(checkLook(r, wrong)).toMatchObject({ perfect: false, correct: r.slots.length - 1 });
    expect(checkLook(r, {}).correct).toBe(0);
    expect(closetPoints(r, 5)).toBe(r.slots.length * 100 + 50);
  });
});

describe('PJOY PAIRS', () => {
  const keys = Array.from({ length: 14 }, (_, i) => `k${i}`);
  it('deals each picture exactly twice for every difficulty', () => {
    for (const d of Object.values(PAIRS)) {
      const st = createPairs(makeRng(2), keys, d.pairs);
      expect(st.cards).toHaveLength(d.pairs * 2);
      const counts = new Map<string, number>();
      for (const c of st.cards) counts.set(c.key, (counts.get(c.key) ?? 0) + 1);
      expect([...counts.values()].every((n) => n === 2)).toBe(true);
    }
    expect(() => createPairs(makeRng(2), keys.slice(0, 3), 6)).toThrow();
  });

  it('match, miss, re-hide, moves and completion', () => {
    const st = createPairs(makeRng(4), keys, 6);
    const first = st.cards[0]!.key;
    const mate = st.cards.findIndex((c, i) => i > 0 && c.key === first);
    const other = st.cards.findIndex((c) => c.key !== first);
    expect(flip(st, 0)).toBe('flip');
    expect(flip(st, 0)).toBeNull();
    expect(flip(st, other)).toBe('miss');
    expect(st.moves).toBe(1);
    settle(st);
    expect(st.cards[0]!.up || st.cards[other]!.up).toBe(false);
    flip(st, 0);
    expect(flip(st, mate)).toBe('match');
    expect(st.cards[0]!.matched && st.cards[mate]!.matched).toBe(true);
    let last = null;
    for (let i = 0; i < st.cards.length; i++) {
      if (st.cards[i]!.matched) continue;
      const j = st.cards.findIndex((c, k) => k !== i && c.key === st.cards[i]!.key);
      flip(st, i);
      last = flip(st, j);
    }
    expect(last).toBe('done');
    expect(st.matched).toBe(6);
  });

  it('fewer moves and less time score higher; harder pays more', () => {
    expect(pairsScore(8, 8, 20, 1)).toBeGreaterThan(pairsScore(8, 20, 20, 1));
    expect(pairsScore(8, 8, 20, 1)).toBeGreaterThan(pairsScore(8, 8, 90, 1));
    expect(pairsScore(8, 8, 20, 2)).toBeGreaterThan(pairsScore(8, 8, 20, 1));
    expect(pairsScore(6, 500, 999, 1)).toBe(50);
  });
});

describe('PACK THE DROP', () => {
  const kinds = ['pjoys', 'socks', 'cap', 'hoodie', 'tee', 'jeans', 'sleeve', 'jersey'];
  it('boxes grow and speed up; every listed item is on the shelf', () => {
    const b1 = packBox(makeRng(5), 1, kinds);
    const b9 = packBox(makeRng(5), 9, kinds);
    expect(packCount(b9.list)).toBeGreaterThan(packCount(b1.list));
    expect(b9.time).toBeLessThan(b1.time);
    for (let n = 1; n < 15; n++)
      for (let seed = 0; seed < 20; seed++) {
        const b = packBox(makeRng(seed), n, kinds);
        for (const k of Object.keys(b.list)) expect(b.shelf).toContain(k);
        expect(new Set(b.shelf).size).toBe(b.shelf.length);
      }
  });

  it('validates the exact items and quantities, order free', () => {
    const list = { socks: 2, cap: 1 };
    expect(checkPack(list, ['cap', 'socks', 'socks'])).toBe(true);
    expect(checkPack(list, ['cap', 'socks'])).toBe(false);
    expect(checkPack(list, ['cap', 'socks', 'socks', 'tee'])).toBe(false);
    expect(checkPack(list, [])).toBe(false);
  });
});
