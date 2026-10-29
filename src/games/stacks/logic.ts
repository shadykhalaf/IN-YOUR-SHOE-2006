import { makeRng, shuffle, type Rng } from '../shared/rng';

/** IYS STACKS — pure falling-block rules: 10 × 20 board, the 7 four-cell shapes, 7-bag order. */
export const COLS = 10;
export const ROWS = 20;
export type Kind = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export const KINDS: Kind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

/** Spawn orientation cells (x, y) inside a 4×4 box. */
const BASE: Record<Kind, [number, number][]> = {
  I: [[0, 1], [1, 1], [2, 1], [3, 1]],
  O: [[1, 0], [2, 0], [1, 1], [2, 1]],
  T: [[1, 0], [0, 1], [1, 1], [2, 1]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]],
  Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
  J: [[0, 0], [0, 1], [1, 1], [2, 1]],
  L: [[2, 0], [0, 1], [1, 1], [2, 1]],
};
const SIZE: Record<Kind, number> = { I: 4, O: 4, T: 3, S: 3, Z: 3, J: 3, L: 3 };

export function cells(kind: Kind, rot: number): [number, number][] {
  const n = SIZE[kind];
  let c = BASE[kind];
  if (kind === 'O') return c;
  for (let r = 0; r < ((rot % 4) + 4) % 4; r++) c = c.map(([x, y]) => [n - 1 - y, x] as [number, number]);
  return c;
}

export interface Piece {
  kind: Kind;
  rot: number;
  x: number;
  y: number;
}
export interface StacksState {
  board: (Kind | null)[][]; // [row][col]
  piece: Piece;
  next: Kind;
  bag: Kind[];
  score: number;
  lines: number;
  level: number;
  over: boolean;
  rng: Rng;
  /** Rows cleared by the last lock (for the "DROP CLEARED!" flash). */
  lastClear: number;
}

export const emptyBoard = () => Array.from({ length: ROWS }, () => Array<Kind | null>(COLS).fill(null));

function draw(st: Pick<StacksState, 'bag' | 'rng'>): Kind {
  if (!st.bag.length) st.bag = shuffle(st.rng, KINDS);
  return st.bag.shift()!;
}
const spawn = (kind: Kind): Piece => ({ kind, rot: 0, x: 3, y: kind === 'I' ? -1 : 0 });

export function fits(board: (Kind | null)[][], p: Piece): boolean {
  return cells(p.kind, p.rot).every(([cx, cy]) => {
    const x = p.x + cx;
    const y = p.y + cy;
    return x >= 0 && x < COLS && y < ROWS && (y < 0 || board[y]![x] === null);
  });
}

export function createStacks(seed = 1): StacksState {
  const st = { bag: [] as Kind[], rng: makeRng(seed) };
  const first = draw(st);
  const next = draw(st);
  return { board: emptyBoard(), piece: spawn(first), next, bag: st.bag, score: 0, lines: 0, level: 1, over: false, rng: st.rng, lastClear: 0 };
}

export function move(st: StacksState, dx: number): boolean {
  const p = { ...st.piece, x: st.piece.x + dx };
  if (st.over || !fits(st.board, p)) return false;
  st.piece = p;
  return true;
}

/** Rotate clockwise with simple kicks (stay, ±1, ±2 sideways, one up). */
export function rotate(st: StacksState, dir = 1): boolean {
  if (st.over) return false;
  const rot = st.piece.rot + dir;
  for (const [kx, ky] of [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]] as const) {
    const p = { ...st.piece, rot, x: st.piece.x + kx, y: st.piece.y + ky };
    if (fits(st.board, p)) {
      st.piece = p;
      return true;
    }
  }
  return false;
}

/** Line clear points × level: 1 = 100, 2 = 300, 3 = 500, 4 = 800. */
export const LINE_POINTS = [0, 100, 300, 500, 800];
export const levelFor = (lines: number) => 1 + Math.floor(lines / 10);
/** Gravity interval (s) per level, floor 70 ms. */
export const gravity = (level: number) => Math.max(0.07, 0.8 * Math.pow(0.85, level - 1));

function lock(st: StacksState): void {
  for (const [cx, cy] of cells(st.piece.kind, st.piece.rot)) {
    const y = st.piece.y + cy;
    if (y < 0) {
      st.over = true;
      continue;
    }
    st.board[y]![st.piece.x + cx] = st.piece.kind;
  }
  const kept = st.board.filter((row) => row.some((c) => c === null));
  const cleared = ROWS - kept.length;
  st.board = [...Array.from({ length: cleared }, () => Array<Kind | null>(COLS).fill(null)), ...kept];
  st.lastClear = cleared;
  if (cleared) {
    st.score += LINE_POINTS[cleared]! * st.level;
    st.lines += cleared;
    st.level = levelFor(st.lines);
  }
  if (st.over) return;
  st.piece = spawn(st.next);
  st.next = draw(st);
  if (!fits(st.board, st.piece)) st.over = true;
}

/** One gravity step: down, or lock. `soft` adds 1 point (a player soft drop). */
export function drop(st: StacksState, soft = false): 'moved' | 'locked' {
  if (st.over) return 'locked';
  const p = { ...st.piece, y: st.piece.y + 1 };
  if (fits(st.board, p)) {
    st.piece = p;
    if (soft) st.score += 1;
    return 'moved';
  }
  lock(st);
  return 'locked';
}

/** Drop straight down and lock (2 points per row). */
export function hardDrop(st: StacksState): number {
  if (st.over) return 0;
  let n = 0;
  while (fits(st.board, { ...st.piece, y: st.piece.y + 1 })) {
    st.piece = { ...st.piece, y: st.piece.y + 1 };
    n++;
  }
  st.score += n * 2;
  lock(st);
  return n;
}

/** Where the piece would land (ghost). */
export function ghostY(st: StacksState): number {
  let y = st.piece.y;
  while (fits(st.board, { ...st.piece, y: y + 1 })) y++;
  return y;
}
