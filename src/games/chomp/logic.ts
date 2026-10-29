import { makeRng, type Rng } from '../shared/rng';

/**
 * CATCHY CHOMP — pure maze-chase rules. Original closet mazes; socks are the
 * pickups, Pjoys flip the chase. Four original enemies, each with its own
 * personality. Grid movement with smooth tile-to-tile progress.
 */
export type Dir = 'up' | 'down' | 'left' | 'right';
export type EnemyKind = 'lint' | 'sock' | 'gremlin' | 'bug';
export const DX: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
const DIRS: Dir[] = ['up', 'left', 'down', 'right'];

export const MAZES: { name: string; rows: string[] }[] = [
  {
    name: 'WARDROBE',
    rows: [
      '###################',
      '#o.......#.......o#',
      '#.##.###.#.###.##.#',
      '#.................#',
      '#.##.#.#####.#.##.#',
      '#....#...#...#....#',
      '####.###.#.###.####',
      '#.......EEEE......#',
      '####.#.#####.#.####',
      '#........P........#',
      '#.##.###.#.###.##.#',
      '#o.#.....#.....#.o#',
      '##.#.#.#####.#.#.##',
      '#....#...#...#....#',
      '###################',
    ],
  },
  {
    name: 'LAUNDRY ROOM',
    rows: [
      '###################',
      '#o...#.......#...o#',
      '#.#.##.#####.##.#.#',
      '#.#.............#.#',
      '#.#.###.###.###.#.#',
      '#.................#',
      '###.#.##EEEE##.#.##',
      '#...#...........#.#',
      '#.#####.##.##.###.#',
      '#.......#P#.......#',
      '#.###.#.#.#.#.###.#',
      '#o..#.#.....#.#..o#',
      '###.#.###.###.#.###',
      '#.................#',
      '###################',
    ],
  },
  {
    name: 'CAIRO ROOFTOPS',
    rows: [
      '###################',
      '#o.......#.......o#',
      '#.#.###.###.###.#.#',
      '#.#.#.........#.#.#',
      '#...#.##.#.##.#...#',
      '###.#....#....#.###',
      '#...##.#EEEE#.##..#',
      '#.#....#....#....##',
      '#.#.##.###.##.##..#',
      '#.#......P........#',
      '#.####.#.#.#.####.#',
      '#o.....#...#.....o#',
      '#.###.##.#.##.###.#',
      '#........#........#',
      '###################',
    ],
  },
];

export interface Mover {
  x: number;
  y: number;
  dir: Dir;
  /** 0..1 progress from (x, y) toward the next tile in `dir`; 0 = standing on (x, y). */
  t: number;
  moving: boolean;
}
export interface Enemy extends Mover {
  kind: EnemyKind;
  home: { x: number; y: number };
  mode: 'wait' | 'chase' | 'scared' | 'eaten';
  release: number;
}
export interface ChompState {
  level: number;
  maze: number;
  w: number;
  h: number;
  walls: boolean[];
  pickups: Map<number, 'sock' | 'pjoy'>;
  player: Mover;
  want: Dir | null;
  start: { x: number; y: number };
  enemies: Enemy[];
  score: number;
  lives: number;
  power: number;
  combo: number;
  /** Seconds of "get ready" freeze after a life is lost or a level starts. */
  freeze: number;
  time: number;
  over: boolean;
  rng: Rng;
}

const KINDS: EnemyKind[] = ['lint', 'sock', 'gremlin', 'bug'];
export const SOCK = 10;
export const PJOY = 50;
export const LIVES = 3;

export function parseMaze(rows: string[]) {
  const h = rows.length;
  const w = rows[0]!.length;
  const walls: boolean[] = [];
  const pickups = new Map<number, 'sock' | 'pjoy'>();
  let start = { x: 1, y: 1 };
  const homes: { x: number; y: number }[] = [];
  rows.forEach((r, y) =>
    [...r].forEach((c, x) => {
      walls[y * w + x] = c === '#';
      if (c === '.') pickups.set(y * w + x, 'sock');
      if (c === 'o') pickups.set(y * w + x, 'pjoy');
      if (c === 'P') start = { x, y };
      if (c === 'E') homes.push({ x, y });
    }),
  );
  return { w, h, walls, pickups, start, homes };
}

export const open = (st: Pick<ChompState, 'w' | 'h' | 'walls'>, x: number, y: number) => x >= 0 && y >= 0 && x < st.w && y < st.h && !st.walls[y * st.w + x];
const canGo = (st: ChompState, m: { x: number; y: number }, d: Dir) => open(st, m.x + DX[d][0], m.y + DX[d][1]);

/** BFS distances from (tx, ty) over open tiles (−1 = unreachable). */
export function distances(st: Pick<ChompState, 'w' | 'h' | 'walls'>, tx: number, ty: number): Int16Array {
  const d = new Int16Array(st.w * st.h).fill(-1);
  if (!open(st, tx, ty)) return d;
  const q = [ty * st.w + tx];
  d[q[0]!] = 0;
  for (let i = 0; i < q.length; i++) {
    const c = q[i]!;
    const x = c % st.w;
    const y = (c - x) / st.w;
    for (const dir of DIRS) {
      const nx = x + DX[dir][0];
      const ny = y + DX[dir][1];
      const n = ny * st.w + nx;
      if (open(st, nx, ny) && d[n] === -1) {
        d[n] = d[c]! + 1;
        q.push(n);
      }
    }
  }
  return d;
}

function loadLevel(st: ChompState, level: number) {
  const maze = (level - 1) % MAZES.length;
  const m = parseMaze(MAZES[maze]!.rows);
  Object.assign(st, { level, maze, w: m.w, h: m.h, walls: m.walls, pickups: m.pickups, start: m.start, power: 0, combo: 0 });
  st.enemies = m.homes.slice(0, 4).map((home, i) => ({ kind: KINDS[i]!, home, x: home.x, y: home.y, dir: i % 2 ? 'left' : 'right', t: 0, moving: false, mode: 'wait', release: i * 1.6 }));
  resetPositions(st);
}

function resetPositions(st: ChompState) {
  st.player = { x: st.start.x, y: st.start.y, dir: 'left', t: 0, moving: false };
  st.want = null;
  st.enemies.forEach((e, i) => Object.assign(e, { x: e.home.x, y: e.home.y, t: 0, moving: false, mode: 'wait', release: i * 1.6 }));
  st.power = 0;
  st.freeze = 1.2;
}

export function createChomp(seed = 1, level = 1): ChompState {
  const st = { score: 0, lives: LIVES, time: 0, over: false, rng: makeRng(seed), enemies: [] as Enemy[] } as unknown as ChompState;
  loadLevel(st, level);
  return st;
}

export const playerSpeed = (level: number) => Math.min(8, 6.4 + level * 0.2);
export function enemySpeed(e: Enemy, level: number) {
  const base = Math.min(7.6, 4.8 + level * 0.35) * (e.kind === 'sock' ? 0.85 : 1);
  return e.mode === 'scared' ? base * 0.55 : e.mode === 'eaten' ? 11 : base;
}
export const powerTime = (level: number) => Math.max(3, 7.5 - level * 0.75);

/** Continuous tile position (for drawing and collision). */
export const pos = (m: Mover): [number, number] => [m.x + DX[m.dir][0] * m.t, m.y + DX[m.dir][1] * m.t];

function choices(st: ChompState, e: Mover): Dir[] {
  const all = DIRS.filter((d) => canGo(st, e, d));
  const fwd = all.filter((d) => d !== OPP[e.dir]);
  return fwd.length ? fwd : all;
}

/** Each enemy's personality: where it wants to be. */
export function enemyTarget(st: ChompState, e: Enemy): { x: number; y: number } | null {
  const p = st.player;
  if (e.mode === 'eaten') return e.home;
  if (e.mode === 'scared') return null;
  switch (e.kind) {
    case 'lint': // Lint Monster: follows Catchy along the shortest path
      return p;
    case 'gremlin': {
      // Packaging Gremlin: cuts Catchy off 4 tiles ahead
      const [dx, dy] = DX[p.dir];
      return { x: Math.max(0, Math.min(st.w - 1, p.x + dx * 4)), y: Math.max(0, Math.min(st.h - 1, p.y + dy * 4)) };
    }
    case 'bug': {
      // Closet Bug: chases from afar, scuttles back to its corner when close
      const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y);
      return d > 6 ? p : { x: 1, y: st.h - 2 };
    }
    default:
      return null; // Lost Sock: wanders at random
  }
}

function decide(st: ChompState, e: Enemy): Dir {
  const opts = choices(st, e);
  if (opts.length === 1) return opts[0]!;
  const target = enemyTarget(st, e);
  if (e.mode === 'scared') {
    // run away from Catchy (with a little panic)
    if (st.rng() < 0.25) return opts[Math.floor(st.rng() * opts.length)]!;
    const away = distances(st, st.player.x, st.player.y);
    return opts.reduce((a, b) => (away[(e.y + DX[b][1]) * st.w + e.x + DX[b][0]]! > away[(e.y + DX[a][1]) * st.w + e.x + DX[a][0]]! ? b : a));
  }
  if (!target) return opts[Math.floor(st.rng() * opts.length)]!;
  if (e.kind === 'gremlin' && e.mode === 'chase') {
    // straight-line instinct toward the cut-off point
    const dist = (d: Dir) => Math.hypot(e.x + DX[d][0] - target.x, e.y + DX[d][1] - target.y);
    return opts.reduce((a, b) => (dist(b) < dist(a) ? b : a));
  }
  const map = distances(st, target.x, target.y);
  const score = (d: Dir) => {
    const v = map[(e.y + DX[d][1]) * st.w + e.x + DX[d][0]]!;
    return v < 0 ? 9999 : v;
  };
  return opts.reduce((a, b) => (score(b) < score(a) ? b : a));
}

export type ChompEvent = 'sock' | 'pjoy' | 'eat' | 'hit' | 'clear' | 'over';

function advancePlayer(st: ChompState, dt: number, ev: ChompEvent[]) {
  const p = st.player;
  const want = st.want;
  // instant reverse mid-tile
  if (want && p.t > 0 && want === OPP[p.dir]) {
    p.x += DX[p.dir][0];
    p.y += DX[p.dir][1];
    p.dir = want;
    p.t = 1 - p.t;
  }
  let move = playerSpeed(st.level) * dt;
  let guard = 0;
  while (move > 0 && guard++ < 4) {
    if (p.t === 0) {
      eat(st, ev);
      if (want && canGo(st, p, want)) p.dir = want;
      if (!canGo(st, p, p.dir)) {
        p.moving = false;
        return;
      }
      p.moving = true;
    }
    const step = Math.min(move, 1 - p.t);
    p.t += step;
    move -= step;
    if (p.t >= 1 - 1e-9) {
      p.x += DX[p.dir][0];
      p.y += DX[p.dir][1];
      p.t = 0;
    }
  }
  if (p.t === 0) eat(st, ev);
}

function eat(st: ChompState, ev: ChompEvent[]) {
  const i = st.player.y * st.w + st.player.x;
  const k = st.pickups.get(i);
  if (!k) return;
  st.pickups.delete(i);
  if (k === 'sock') {
    st.score += SOCK;
    ev.push('sock');
  } else {
    st.score += PJOY;
    st.power = powerTime(st.level);
    st.combo = 0;
    for (const e of st.enemies) if (e.mode === 'chase') {
      e.mode = 'scared';
      if (e.t > 0) {
        // turn around on the spot
        e.x += DX[e.dir][0];
        e.y += DX[e.dir][1];
        e.dir = OPP[e.dir];
        e.t = 1 - e.t;
      }
    }
    ev.push('pjoy');
  }
}

function advanceEnemy(st: ChompState, e: Enemy, dt: number) {
  if (e.mode === 'wait') {
    e.release -= dt;
    if (e.release > 0) return;
    e.mode = st.power > 0 ? 'scared' : 'chase';
  }
  let move = enemySpeed(e, st.level) * dt;
  let guard = 0;
  while (move > 0 && guard++ < 4) {
    if (e.t === 0) {
      if (e.mode === 'eaten' && e.x === e.home.x && e.y === e.home.y) e.mode = 'chase';
      e.dir = decide(st, e);
      if (!canGo(st, e, e.dir)) return;
    }
    const step = Math.min(move, 1 - e.t);
    e.t += step;
    move -= step;
    if (e.t >= 1 - 1e-9) {
      e.x += DX[e.dir][0];
      e.y += DX[e.dir][1];
      e.t = 0;
    }
  }
}

/** Advance the game by dt seconds. `want` = the direction the player is holding / last pressed. */
export function stepChomp(st: ChompState, dt: number): ChompEvent[] {
  const ev: ChompEvent[] = [];
  if (st.over) return ev;
  st.time += dt;
  if (st.freeze > 0) {
    st.freeze = Math.max(0, st.freeze - dt);
    return ev;
  }
  advancePlayer(st, dt, ev);
  if (st.power > 0) {
    st.power = Math.max(0, st.power - dt);
    if (st.power === 0) for (const e of st.enemies) if (e.mode === 'scared') e.mode = 'chase';
  }
  for (const e of st.enemies) advanceEnemy(st, e, dt);
  // collisions
  const [px, py] = pos(st.player);
  for (const e of st.enemies) {
    if (e.mode === 'wait' && e.release > 0) continue;
    const [ex, ey] = pos(e);
    if (Math.abs(ex - px) + Math.abs(ey - py) > 0.6) continue;
    if (e.mode === 'scared') {
      e.mode = 'eaten';
      st.combo++;
      st.score += 100 * 2 ** st.combo;
      ev.push('eat');
    } else if (e.mode === 'chase' || e.mode === 'wait') {
      st.lives--;
      ev.push('hit');
      if (st.lives <= 0) {
        st.over = true;
        ev.push('over');
      } else resetPositions(st);
      return ev;
    }
  }
  if (st.pickups.size === 0) {
    ev.push('clear');
    loadLevel(st, st.level + 1);
  }
  return ev;
}
