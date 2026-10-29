import { describe, expect, it } from 'vitest';
import { makeRng } from '../games/shared/rng';
import { createSnake, freeCell, PJOY_POINTS, same, SOCK_POINTS, step, stepInterval, turn } from '../games/snake/logic';

describe('CATCHY SNAKE rules', () => {
  it('moves one cell per step in the current direction', () => {
    const s = createSnake(1);
    const h = { ...s.snake[0]! };
    s.food = { x: 0, y: 0 };
    step(s);
    expect(s.snake[0]).toEqual({ x: h.x + 1, y: h.y });
    expect(s.snake).toHaveLength(3);
  });

  it('ignores an immediate reverse and buffers at most two turns', () => {
    const s = createSnake(1);
    turn(s, 'left');
    expect(s.queue).toEqual([]);
    turn(s, 'up');
    turn(s, 'left');
    turn(s, 'down');
    expect(s.queue).toEqual(['up', 'left']);
    // a quick up+down can't fold the snake into itself
    const t = createSnake(1);
    turn(t, 'up');
    turn(t, 'down');
    expect(t.queue).toEqual(['up']);
  });

  it('eating a sock scores, grows and respawns the sock off the snake', () => {
    const s = createSnake(3);
    const h = s.snake[0]!;
    s.food = { x: h.x + 1, y: h.y };
    expect(step(s)).toBe('sock');
    expect(s.score).toBe(SOCK_POINTS);
    expect(s.snake).toHaveLength(4);
    expect(s.snake.some((c) => same(c, s.food))).toBe(false);
  });

  it('the Pjoy bonus is worth more, grows by two and expires', () => {
    const s = createSnake(4);
    const h = s.snake[0]!;
    s.food = { x: 0, y: 0 };
    s.bonus = { x: h.x + 1, y: h.y, ttl: 5 };
    expect(step(s)).toBe('pjoy');
    expect(s.score).toBe(PJOY_POINTS);
    step(s);
    expect(s.snake).toHaveLength(5);
    const e = createSnake(4);
    e.food = { x: 0, y: 0 };
    e.bonus = { x: 0, y: 17, ttl: 2 };
    step(e);
    step(e);
    expect(e.bonus).toBeNull();
  });

  it('dies on the wall', () => {
    const s = createSnake(5);
    s.food = { x: 0, y: 0 };
    let ev = null;
    for (let i = 0; i < 30 && s.alive; i++) ev = step(s);
    expect(ev).toBe('dead');
    expect(s.alive).toBe(false);
    expect(s.snake[0]!.x).toBe(s.cols - 1);
  });

  it('dies biting its own body', () => {
    const s = createSnake(6);
    s.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 4, y: 6 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }];
    s.food = { x: 0, y: 0 };
    s.dir = 'right';
    turn(s, 'down');
    expect(step(s)).toBe('dead');
  });

  it('may follow its own tail into the cell the tail is leaving', () => {
    const s = createSnake(7);
    s.snake = [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }];
    s.dir = 'up';
    s.food = { x: 0, y: 0 };
    turn(s, 'right');
    expect(step(s)).toBeNull();
    expect(s.alive).toBe(true);
  });

  it('food never spawns on the snake, even on a nearly full board', () => {
    const rng = makeRng(9);
    const st = { cols: 4, rows: 4, snake: Array.from({ length: 15 }, (_, i) => ({ x: i % 4, y: Math.floor(i / 4) })) };
    for (let i = 0; i < 50; i++) expect(freeCell(st, rng)).toEqual({ x: 3, y: 3 });
    expect(freeCell({ ...st, snake: [...st.snake, { x: 3, y: 3 }] }, rng)).toBeNull();
    for (let seed = 0; seed < 200; seed++) {
      const s = createSnake(seed);
      expect(s.snake.some((c) => same(c, s.food))).toBe(false);
    }
  });

  it('speeds up as it eats, with a floor', () => {
    expect(stepInterval(10)).toBeLessThan(stepInterval(0));
    expect(stepInterval(1000)).toBe(0.06);
  });
});
