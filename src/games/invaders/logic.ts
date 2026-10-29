import { makeRng, type Rng } from '../shared/rng';

/**
 * CATCHY INVADERS — pure wave-shooter rules. Catchy flies a Y2K UFO against
 * runaway socks, laundry blobs, closet creatures and tag gremlins; wave 5 is
 * the LINT KING, a laundry-basket boss. PJOY = triple shot, SOCK = rapid fire.
 */
export const W = 360;
export const H = 540;
export const PLAYER_Y = 500;
export const PLAYER_HALF = 22;
export const WAVES = 5;
export type FoeKind = 'sock' | 'blob' | 'closet' | 'tag' | 'boss';
export type PowerKind = 'pjoy' | 'sock';

export interface Foe {
  kind: FoeKind;
  x: number;
  y: number;
  hp: number;
  max: number;
  r: number;
  /** diving: leaves the formation toward the player */
  dive: { vx: number; vy: number } | null;
  hx: number;
  hy: number;
}
export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
}
export interface Power {
  kind: PowerKind;
  x: number;
  y: number;
}
export interface InvState {
  wave: number;
  px: number;
  lives: number;
  invuln: number;
  cooldown: number;
  multi: number;
  rapid: number;
  shots: Shot[];
  bombs: Shot[];
  foes: Foe[];
  powers: Power[];
  dir: number;
  /** formation offset */
  ox: number;
  oy: number;
  intermission: number;
  bossFire: number;
  diveTimer: number;
  kills: number;
  dropped: boolean;
  score: number;
  over: boolean;
  won: boolean;
  time: number;
  rng: Rng;
}

const POINTS: Record<FoeKind, number> = { sock: 10, blob: 20, closet: 30, tag: 40, boss: 2000 };
const HP: Record<FoeKind, number> = { sock: 1, blob: 2, closet: 2, tag: 1, boss: 70 };

export interface WaveDef {
  rows: FoeKind[];
  cols: number;
  speed: number;
  fire: number;
  dives: boolean;
}
export const WAVE_DEFS: WaveDef[] = [
  { rows: ['sock', 'sock', 'sock'], cols: 7, speed: 26, fire: 0.5, dives: false },
  { rows: ['blob', 'sock', 'sock', 'blob'], cols: 7, speed: 32, fire: 0.75, dives: false },
  { rows: ['closet', 'closet', 'blob', 'sock'], cols: 7, speed: 36, fire: 0.9, dives: true },
  { rows: ['tag', 'closet', 'blob', 'blob', 'sock'], cols: 7, speed: 42, fire: 1.15, dives: true },
  { rows: ['boss'], cols: 1, speed: 60, fire: 0, dives: false },
];

function loadWave(st: InvState, wave: number) {
  const def = WAVE_DEFS[wave - 1]!;
  st.wave = wave;
  st.ox = 0;
  st.oy = 0;
  st.dir = 1;
  st.kills = 0;
  st.dropped = false;
  st.bombs = [];
  st.diveTimer = 3;
  st.foes = [];
  if (def.rows[0] === 'boss') {
    st.foes.push({ kind: 'boss', x: W / 2, y: 110, hx: W / 2, hy: 110, hp: HP.boss, max: HP.boss, r: 44, dive: null });
    st.bossFire = 1.5;
    return;
  }
  const gap = 40;
  const x0 = (W - (def.cols - 1) * gap) / 2;
  def.rows.forEach((kind, row) => {
    for (let c = 0; c < def.cols; c++) {
      const hx = x0 + c * gap;
      const hy = 70 + row * 36;
      st.foes.push({ kind, x: hx, y: hy, hx, hy, hp: HP[kind], max: HP[kind], r: 14, dive: null });
    }
  });
}

export function createInvaders(seed = 1, wave = 1): InvState {
  const st = { px: W / 2, lives: 3, invuln: 0, cooldown: 0, multi: 0, rapid: 0, shots: [], bombs: [], foes: [], powers: [], intermission: 0, bossFire: 0, score: 0, over: false, won: false, time: 0, rng: makeRng(seed) } as unknown as InvState;
  loadWave(st, wave);
  return st;
}

export const fireDelay = (st: Pick<InvState, 'rapid'>) => (st.rapid > 0 ? 0.13 : 0.3);
export const PLAYER_SPEED = 240;
export const POWER_TIME = 9;

/** Fire if the cannon is ready: 1 shot, or 3 with the PJOY power. */
export function fire(st: InvState): boolean {
  if (st.cooldown > 0 || st.over || st.intermission > 0) return false;
  st.cooldown = fireDelay(st);
  const y = PLAYER_Y - 26;
  st.shots.push({ x: st.px, y, vx: 0, vy: -480 });
  if (st.multi > 0) {
    st.shots.push({ x: st.px - 8, y, vx: -120, vy: -460 });
    st.shots.push({ x: st.px + 8, y, vx: 120, vy: -460 });
  }
  return true;
}

export type InvEvent = 'hit' | 'kill' | 'power' | 'hurt' | 'wave' | 'boss' | 'win' | 'over' | 'shot';

function hurt(st: InvState, ev: InvEvent[]) {
  if (st.invuln > 0) return;
  st.lives--;
  st.invuln = 2;
  st.bombs = [];
  ev.push('hurt');
  if (st.lives <= 0) {
    st.over = true;
    ev.push('over');
  }
}

/** Advance by dt with steering (−1/0/1) and the fire button held. */
export function stepInvaders(st: InvState, dt: number, steer: number, firing: boolean): InvEvent[] {
  const ev: InvEvent[] = [];
  if (st.over) return ev;
  st.time += dt;
  st.cooldown = Math.max(0, st.cooldown - dt);
  st.invuln = Math.max(0, st.invuln - dt);
  st.multi = Math.max(0, st.multi - dt);
  st.rapid = Math.max(0, st.rapid - dt);
  st.px = Math.max(PLAYER_HALF, Math.min(W - PLAYER_HALF, st.px + steer * PLAYER_SPEED * dt));
  if (st.intermission > 0) {
    st.intermission -= dt;
    if (st.intermission <= 0) {
      loadWave(st, st.wave + 1);
      if (st.wave === WAVES) ev.push('boss');
    }
    return ev;
  }
  if (firing && fire(st)) ev.push('shot');
  const def = WAVE_DEFS[st.wave - 1]!;
  const r = st.rng;

  // formation sway + descent
  const inForm = st.foes.filter((f) => !f.dive && f.kind !== 'boss');
  if (inForm.length) {
    const speed = def.speed * (1 + (1 - inForm.length / (def.rows.length * def.cols)) * 1.2);
    st.ox += st.dir * speed * dt;
    const minX = Math.min(...inForm.map((f) => f.hx + st.ox));
    const maxX = Math.max(...inForm.map((f) => f.hx + st.ox));
    if ((st.dir > 0 && maxX > W - 18) || (st.dir < 0 && minX < 18)) {
      st.dir = -st.dir;
      st.oy += 14;
    }
  }
  for (const f of st.foes) {
    if (f.kind === 'boss') {
      const enraged = f.hp < f.max / 2;
      f.x = W / 2 + Math.sin(st.time * (enraged ? 1.4 : 0.9)) * 120;
      f.y = 110 + Math.sin(st.time * 0.7) * 20;
      st.bossFire -= dt;
      if (st.bossFire <= 0) {
        st.bossFire = enraged ? 0.75 : 1.1;
        const n = enraged ? 7 : 5;
        for (let i = 0; i < n; i++) {
          const a = Math.PI / 2 + (i - (n - 1) / 2) * 0.22;
          st.bombs.push({ x: f.x, y: f.y + 30, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150 });
        }
        if (enraged) {
          const dx = st.px - f.x;
          const dy = PLAYER_Y - f.y;
          const d = Math.hypot(dx, dy);
          st.bombs.push({ x: f.x, y: f.y + 30, vx: (dx / d) * 210, vy: (dy / d) * 210 });
        }
      }
    } else if (f.dive) {
      f.x += f.dive.vx * dt;
      f.y += f.dive.vy * dt;
      f.dive.vx += Math.sign(st.px - f.x) * 160 * dt;
      if (f.y > H + 20) {
        f.dive = null; // loops back into formation from the top
        f.y = -20;
      }
    } else {
      const tx = f.hx + st.ox;
      const ty = f.hy + st.oy;
      // ease back into the slot after a dive
      f.x += (tx - f.x) * Math.min(1, dt * 6);
      f.y += (ty - f.y) * Math.min(1, dt * 6);
    }
  }
  // divers (closet creatures and tags swoop at Catchy)
  if (def.dives) {
    st.diveTimer -= dt;
    if (st.diveTimer <= 0) {
      st.diveTimer = 2.6 - st.wave * 0.25;
      const cands = st.foes.filter((f) => !f.dive && (f.kind === 'closet' || f.kind === 'tag'));
      const f = cands[Math.floor(r() * cands.length)];
      if (f) f.dive = { vx: (r() - 0.5) * 60, vy: 170 };
    }
  }
  // formation fire: a random front-line foe
  if (def.fire && inForm.length && r() < def.fire * dt) {
    const cols = new Map<number, Foe>();
    for (const f of inForm) {
      const k = Math.round(f.hx);
      if (!cols.has(k) || cols.get(k)!.hy < f.hy) cols.set(k, f);
    }
    const front = [...cols.values()];
    const f = front[Math.floor(r() * front.length)]!;
    const aimed = f.kind === 'tag';
    st.bombs.push({ x: f.x, y: f.y + 12, vx: aimed ? Math.sign(st.px - f.x) * 60 : 0, vy: 190 + st.wave * 15 });
  }

  // move shots
  for (const s of st.shots) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
  }
  for (const b of st.bombs) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  for (const p of st.powers) p.y += 90 * dt;

  // player shots vs foes
  for (const s of st.shots) {
    for (const f of st.foes) {
      if (f.hp <= 0 || Math.hypot(s.x - f.x, s.y - f.y) > f.r + 3) continue;
      s.y = -999;
      f.hp--;
      if (f.kind === 'boss') st.score += 5;
      if (f.hp > 0) {
        ev.push('hit');
        break;
      }
      st.score += POINTS[f.kind];
      st.kills++;
      ev.push('kill');
      // power drops: one guaranteed mid-wave, then the odd lucky one
      const half = st.kills >= Math.ceil((def.rows.length * def.cols) / 2);
      if (f.kind !== 'boss' && ((!st.dropped && half) || r() < 0.05)) {
        st.dropped = true;
        st.powers.push({ kind: r() < 0.5 ? 'pjoy' : 'sock', x: f.x, y: f.y });
      }
      break;
    }
  }
  st.foes = st.foes.filter((f) => f.hp > 0);
  st.shots = st.shots.filter((s) => s.y > -20 && s.x > -20 && s.x < W + 20);
  st.bombs = st.bombs.filter((b) => b.y < H + 20 && b.x > -20 && b.x < W + 20);

  // pickups
  st.powers = st.powers.filter((p) => {
    if (Math.abs(p.x - st.px) < PLAYER_HALF + 8 && Math.abs(p.y - PLAYER_Y) < 22) {
      if (p.kind === 'pjoy') st.multi = POWER_TIME;
      else st.rapid = POWER_TIME;
      ev.push('power');
      return false;
    }
    return p.y < H + 20;
  });

  // hits on Catchy: bombs, diving foes, or the formation reaching the floor
  for (const b of st.bombs)
    if (Math.abs(b.x - st.px) < PLAYER_HALF - 4 && Math.abs(b.y - PLAYER_Y) < 14) {
      b.y = H + 99;
      hurt(st, ev);
    }
  for (const f of st.foes)
    if (f.kind !== 'boss' && Math.abs(f.x - st.px) < PLAYER_HALF + f.r - 6 && Math.abs(f.y - PLAYER_Y) < f.r + 6) {
      f.hp = 0;
      hurt(st, ev);
    }
  st.foes = st.foes.filter((f) => f.hp > 0);
  if (st.foes.some((f) => !f.dive && f.kind !== 'boss' && f.y > PLAYER_Y - 30)) {
    st.lives = 0;
    st.over = true;
    ev.push('over');
  }
  if (st.over) return ev;

  if (!st.foes.length) {
    if (st.wave >= WAVES) {
      st.score += st.lives * 500;
      st.won = true;
      st.over = true;
      ev.push('win');
    } else {
      st.intermission = 2;
      st.shots = [];
      st.powers = [];
      ev.push('wave');
    }
  }
  return ev;
}
