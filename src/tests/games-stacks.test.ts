import { describe, expect, it } from 'vitest';
import { cells, COLS, createStacks, drop, fits, gravity, hardDrop, KINDS, LINE_POINTS, levelFor, move, rotate, ROWS, type Kind } from '../games/stacks/logic';

describe('IYS STACKS rules', () => {
  it('has the 7 four-cell shapes and 4 distinct rotations where it matters', () => {
    expect(KINDS).toHaveLength(7);
    for (const k of KINDS) for (let r = 0; r < 4; r++) expect(cells(k, r)).toHaveLength(4);
    const key = (k: Kind, r: number) => JSON.stringify([...cells(k, r)].sort());
    expect(new Set([0, 1, 2, 3].map((r) => key('T', r))).size).toBe(4);
    expect(new Set([0, 1, 2, 3].map((r) => key('O', r))).size).toBe(1);
    expect(key('T', 4)).toBe(key('T', 0));
  });

  it('7-bag: every shape once per 7 spawns', () => {
    const s = createStacks(11);
    const seen: Kind[] = [s.piece.kind];
    for (let i = 0; i < 6; i++) {
      hardDrop(s);
      s.board = s.board.map((r) => r.map(() => null));
      seen.push(s.piece.kind);
    }
    expect([...seen].sort()).toEqual([...KINDS].sort());
  });

  it('moves stop at the walls', () => {
    const s = createStacks(2);
    for (let i = 0; i < 20; i++) move(s, -1);
    expect(Math.min(...cells(s.piece.kind, s.piece.rot).map(([x]) => s.piece.x + x))).toBe(0);
    for (let i = 0; i < 20; i++) move(s, 1);
    expect(Math.max(...cells(s.piece.kind, s.piece.rot).map(([x]) => s.piece.x + x))).toBe(COLS - 1);
  });

  it('collides with settled blocks and locks, spawning the next piece', () => {
    const s = createStacks(3);
    const next = s.next;
    expect(hardDrop(s)).toBeGreaterThan(10);
    expect(s.board.flat().filter(Boolean)).toHaveLength(4);
    expect(s.piece.kind).toBe(next);
    let guard = 0;
    while (drop(s) === 'moved' && guard++ < 40);
    expect(s.board.flat().filter(Boolean)).toHaveLength(8);
  });

  it('rotation kicks off the wall instead of failing', () => {
    const s = createStacks(4);
    s.piece = { kind: 'I', rot: 1, x: -2, y: 5 };
    expect(fits(s.board, s.piece)).toBe(true);
    expect(rotate(s)).toBe(true);
    expect(fits(s.board, s.piece)).toBe(true);
  });

  it('clears full lines, scores × level and levels up every 10 lines', () => {
    const s = createStacks(5);
    for (let y = ROWS - 4; y < ROWS; y++) for (let x = 0; x < COLS; x++) s.board[y]![x] = x === 0 ? null : 'O';
    s.piece = { kind: 'I', rot: 1, x: -2, y: 0 };
    hardDrop(s);
    expect(s.lastClear).toBe(4);
    expect(s.lines).toBe(4);
    expect(s.score).toBe(LINE_POINTS[4]! * 1 + (ROWS - 4) * 2);
    expect(s.board.flat().filter(Boolean)).toHaveLength(0);
    expect(levelFor(9)).toBe(1);
    expect(levelFor(10)).toBe(2);
    expect(gravity(5)).toBeLessThan(gravity(1));
    expect(gravity(99)).toBe(0.07);
  });

  it('tops out: game over when a new piece cannot spawn', () => {
    const s = createStacks(6);
    let n = 0;
    while (!s.over && n++ < 200) hardDrop(s);
    expect(s.over).toBe(true);
    expect(n).toBeLessThan(60);
    expect(drop(s)).toBe('locked');
    expect(move(s, 1)).toBe(false);
  });
});
