import { pick, shuffle, type Rng } from '../shared/rng';

/* ───────────── CATCHY CLOSET: recreate the target look ───────────── */
export type Slot = 'top' | 'bottom' | 'socks' | 'extra';
export const SLOTS: Slot[] = ['top', 'bottom', 'socks', 'extra'];
export const SLOT_LABEL: Record<Slot, string> = { top: 'TOP', bottom: 'BOTTOM', socks: 'SOCKS', extra: 'EXTRA' };
export const CLOSET: Record<Slot, string[]> = {
  top: ['cereal', 'matcha', 'fluffy', 'stripe', 'plaid', 'hoodie'],
  bottom: ['cereal', 'matcha', 'denim', 'shorts', 'plaid'],
  socks: ['coral', 'teal', 'yellow', 'hearts', 'white'],
  extra: ['cap', 'headphones', 'scarf', 'shades', 'bow'],
};
export const CLOSET_ROUNDS = 10;
export const CLOSET_HEARTS = 3;

export interface ClosetRound {
  n: number;
  slots: Slot[];
  options: Record<Slot, string[]>;
  target: Partial<Record<Slot, string>>;
  time: number;
}

/** Round n (1-based): more slots, more options, less time. */
export function closetRound(rng: Rng, n: number): ClosetRound {
  const slots = SLOTS.slice(0, Math.min(4, 2 + Math.floor((n - 1) / 2)));
  const count = Math.min(5, 3 + Math.floor((n - 1) / 3));
  const options = {} as Record<Slot, string[]>;
  const target: Partial<Record<Slot, string>> = {};
  for (const s of SLOTS) options[s] = shuffle(rng, CLOSET[s]).slice(0, count);
  for (const s of slots) target[s] = pick(rng, options[s]);
  return { n, slots, options, target, time: Math.max(8, 21 - n) };
}

export function checkLook(r: ClosetRound, picks: Partial<Record<Slot, string>>) {
  const correct = r.slots.filter((s) => picks[s] === r.target[s]).length;
  return { correct, total: r.slots.length, perfect: correct === r.slots.length };
}
export const closetPoints = (r: ClosetRound, timeLeft: number) => r.slots.length * 100 + Math.max(0, Math.ceil(timeLeft)) * 10;

/* ───────────── PJOY PAIRS: memory ───────────── */
export type Difficulty = 'easy' | 'normal' | 'hard';
export const PAIRS: Record<Difficulty, { pairs: number; cols: number; mult: number }> = {
  easy: { pairs: 6, cols: 4, mult: 1 },
  normal: { pairs: 8, cols: 4, mult: 1.5 },
  hard: { pairs: 12, cols: 6, mult: 2 },
};
export interface Card {
  key: string;
  matched: boolean;
  up: boolean;
}
export interface PairsState {
  cards: Card[];
  open: number[];
  moves: number;
  matched: number;
  pairs: number;
}

export function createPairs(rng: Rng, keys: string[], pairs: number): PairsState {
  const chosen = shuffle(rng, keys).slice(0, pairs);
  if (chosen.length < pairs) throw new Error('not enough pictures');
  const cards = shuffle(rng, [...chosen, ...chosen]).map((key) => ({ key, matched: false, up: false }));
  return { cards, open: [], moves: 0, matched: 0, pairs };
}

/** Turn a card. A third flip first hides an unmatched pair. */
export function flip(st: PairsState, i: number): 'flip' | 'match' | 'miss' | 'done' | null {
  const c = st.cards[i];
  if (!c || c.up || c.matched) return null;
  if (st.open.length === 2) settle(st);
  c.up = true;
  st.open.push(i);
  if (st.open.length < 2) return 'flip';
  st.moves++;
  const [a, b] = st.open.map((k) => st.cards[k]!);
  if (a!.key === b!.key) {
    a!.matched = b!.matched = true;
    st.open = [];
    st.matched++;
    return st.matched === st.pairs ? 'done' : 'match';
  }
  return 'miss';
}

/** Hide an open, unmatched pair. */
export function settle(st: PairsState) {
  for (const k of st.open) if (!st.cards[k]!.matched) st.cards[k]!.up = false;
  st.open = [];
}

export const pairsScore = (pairs: number, moves: number, secs: number, mult: number) => Math.max(50, Math.round((pairs * 150 - Math.max(0, moves - pairs) * 15 - Math.floor(secs) * 2) * mult));

/* ───────────── PACK THE DROP: pack exactly what the list shows ───────────── */
export const PACK_STRIKES = 3;
export type PackList = Record<string, number>;
export interface PackBox {
  n: number;
  list: PackList;
  shelf: string[];
  time: number;
}

/** Box n: more pieces, more look-alikes on the shelf, less time. */
export function packBox(rng: Rng, n: number, kinds: string[]): PackBox {
  const variety = Math.min(4, 1 + Math.floor((n + 1) / 2));
  const pieces = Math.min(6, 2 + Math.floor(n / 2));
  const picked = shuffle(rng, kinds).slice(0, variety);
  const list: PackList = {};
  for (let i = 0; i < pieces; i++) {
    const k = i < picked.length ? picked[i]! : pick(rng, picked);
    list[k] = (list[k] ?? 0) + 1;
  }
  const shelfSize = Math.min(kinds.length, Math.max(variety + 2, 4 + Math.floor(n / 2)));
  const shelf = shuffle(rng, [...picked, ...shuffle(rng, kinds.filter((k) => !picked.includes(k))).slice(0, shelfSize - variety)]);
  return { n, list, shelf, time: Math.max(6, 16 - n) };
}

export const packCount = (list: PackList) => Object.values(list).reduce((a, b) => a + b, 0);

export function checkPack(list: PackList, packed: string[]): boolean {
  const got: PackList = {};
  for (const k of packed) got[k] = (got[k] ?? 0) + 1;
  const keys = new Set([...Object.keys(list), ...Object.keys(got)]);
  return [...keys].every((k) => (list[k] ?? 0) === (got[k] ?? 0));
}
export const packPoints = (box: PackBox, timeLeft: number) => packCount(box.list) * 50 + Math.max(0, Math.ceil(timeLeft)) * 5;
