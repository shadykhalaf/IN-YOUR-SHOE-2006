import { makeRng, type Rng } from '../shared/rng';

/** CATCHY SNAKE — pure rules. Catchy is the head; the body is a trail of socks. */
export type Dir = 'up' | 'down' | 'left' | 'right';
export interface Cell {
  x: number;
  y: number;
}
export interface SnakeState {
  cols: number;
  rows: number;
  snake: Cell[]; // [0] = Catchy
  dir: Dir;
  queue: Dir[];
  food: Cell;
  /** Temporary Pjoy bonus: worth more, vanishes after `ttl` steps. */
  bonus: (Cell & { ttl: number }) | null;
  score: number;
  eaten: number;
  alive: boolean;
  grow: number;
  rng: Rng;
}

export const SOCK_POINTS = 10;
export const PJOY_POINTS = 50;
export const BONUS_TTL = 40;
const OPP: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
const DELTA: Record<Dir, Cell> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

export const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;

/** A random empty cell (never on the snake or another pickup), or null when the board is full. */
export function freeCell(st: Pick<SnakeState, 'cols' | 'rows' | 'snake'>, rng: Rng, avoid: (Cell | null)[] = []): Cell | null {
  const taken = new Set(st.snake.map((c) => c.y * st.cols + c.x));
  for (const a of avoid) if (a) taken.add(a.y * st.cols + a.x);
  const free: number[] = [];
  for (let i = 0; i < st.cols * st.rows; i++) if (!taken.has(i)) free.push(i);
  if (!free.length) return null;
  const i = free[Math.floor(rng() * free.length)]!;
  return { x: i % st.cols, y: Math.floor(i / st.cols) };
}

export function createSnake(seed = 1, cols = 18, rows = 18): SnakeState {
  const rng = makeRng(seed);
  const cy = Math.floor(rows / 2);
  const snake = [
    { x: 5, y: cy },
    { x: 4, y: cy },
    { x: 3, y: cy },
  ];
  const st: SnakeState = { cols, rows, snake, dir: 'right', queue: [], food: { x: 0, y: 0 }, bonus: null, score: 0, eaten: 0, alive: true, grow: 0, rng };
  st.food = freeCell(st, rng)!;
  return st;
}

/** Queue a turn. Reversing straight into the body is ignored; at most two turns are buffered. */
export function turn(st: SnakeState, d: Dir): void {
  const last = st.queue[st.queue.length - 1] ?? st.dir;
  if (d === last || d === OPP[last] || st.queue.length >= 2) return;
  st.queue.push(d);
}

/** Step interval (s): starts relaxed, speeds up with every sock, never below 60 ms. */
export const stepInterval = (eaten: number) => Math.max(0.06, 0.16 - eaten * 0.004);

export type SnakeEvent = 'sock' | 'pjoy' | 'dead' | null;

export function step(st: SnakeState): SnakeEvent {
  if (!st.alive) return null;
  const next = st.queue.shift();
  if (next) st.dir = next;
  const head = st.snake[0]!;
  const d = DELTA[st.dir];
  const nh = { x: head.x + d.x, y: head.y + d.y };
  // Moving into the cell the tail is leaving is fine (unless we're growing this step).
  const willGrow = st.grow > 0 || same(nh, st.food) || (st.bonus !== null && same(nh, st.bonus));
  const body = willGrow ? st.snake : st.snake.slice(0, -1);
  if (nh.x < 0 || nh.y < 0 || nh.x >= st.cols || nh.y >= st.rows || body.some((c) => same(c, nh))) {
    st.alive = false;
    return 'dead';
  }
  st.snake.unshift(nh);
  let ev: SnakeEvent = null;
  if (same(nh, st.food)) {
    st.score += SOCK_POINTS;
    st.eaten++;
    st.grow += 1;
    ev = 'sock';
    const f = freeCell(st, st.rng, [st.bonus]);
    if (!f) {
      st.alive = false; // board full: the run is complete
      return 'dead';
    }
    st.food = f;
    if (!st.bonus && st.eaten % 5 === 0) {
      const b = freeCell(st, st.rng, [st.food]);
      if (b) st.bonus = { ...b, ttl: BONUS_TTL };
    }
  } else if (st.bonus && same(nh, st.bonus)) {
    st.score += PJOY_POINTS;
    st.grow += 2;
    st.bonus = null;
    ev = 'pjoy';
  }
  if (st.grow > 0) st.grow--;
  else st.snake.pop();
  if (st.bonus && --st.bonus.ttl <= 0) st.bonus = null;
  return ev;
}
