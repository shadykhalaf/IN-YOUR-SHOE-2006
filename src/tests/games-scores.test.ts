import { describe, expect, it, vi } from 'vitest';
import { GAMES } from '../games/registry';
import { readBest, scoreKey, submitScore } from '../games/shared/scores';
import type { SyncStorage } from '../state/storage';

const mem = (): SyncStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
};

describe('MY HIGH SCORES storage', () => {
  it('uses iys2006.games.<id>.highScore keys', () => {
    expect(scoreKey('snake')).toBe('iys2006.games.snake.highScore');
    expect(scoreKey('purbale-pairs')).toBe('iys2006.games.purbale-pairs.highScore');
  });

  it('saves a new best and never lets a lower score overwrite it', () => {
    const s = mem();
    expect(submitScore('snake', 120, s)).toEqual({ best: 120, isNew: true });
    expect(submitScore('snake', 80, s)).toEqual({ best: 120, isNew: false });
    expect(submitScore('snake', 120, s)).toEqual({ best: 120, isNew: false });
    expect(s.data.get('iys2006.games.snake.highScore')).toBe('120');
    expect(submitScore('snake', 121.9, s)).toEqual({ best: 121, isNew: true });
  });

  it('a zero / negative / NaN run never creates a record', () => {
    const s = mem();
    for (const v of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) expect(submitScore('tower', v, s).isNew).toBe(false);
    expect(s.data.size).toBe(0);
  });

  it('garbage in storage reads as no score', () => {
    const s = mem();
    for (const v of ['abc', '-3', '1.5', '', '1e400']) {
      s.data.set(scoreKey('chomp'), v);
      expect(readBest('chomp', s)).toBe(0);
    }
  });

  it('storage that throws never crashes the game', () => {
    const broken: SyncStorage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {},
    };
    expect(readBest('stacks', broken)).toBe(0);
    expect(submitScore('stacks', 500, broken)).toEqual({ best: 500, isNew: true });
  });

  it('nothing is sent anywhere', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const s = mem();
    submitScore('invaders', 999, s);
    readBest('invaders', s);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('IYS GAMES registry', () => {
  it('six games, unique ids, a title, a one-line blurb and at least one local best each', () => {
    expect(GAMES.map((g) => g.id)).toEqual(['purbale', 'tower', 'chomp', 'stacks', 'snake', 'invaders']);
    for (const g of GAMES) {
      expect(g.title).toMatch(/^[A-Z ]+$/);
      expect(g.blurb.length).toBeLessThan(110);
      expect(g.blurb).not.toMatch(/coming soon/i);
      expect(g.scores.length).toBeGreaterThan(0);
      expect(typeof g.load).toBe('function');
    }
    expect(GAMES.find((g) => g.id === 'purbale')!.scores.map((s) => s.id)).toEqual(['purbale-closet', 'purbale-pairs', 'purbale-pack']);
  });
});
