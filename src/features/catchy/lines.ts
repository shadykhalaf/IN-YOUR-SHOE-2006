import type { BagKind } from './types';

/**
 * Hand-written Catchy lines (IYS Y2K internet voice). Mascot, not support
 * desk: no sales pressure, no "buy now", no "how can I help".
 */
export const LINES = {
  greet: ['hi xd', 'hiii', ':P', '<3', 'u found me', 'boop'],
  idle: ['ur still here??', 'brb', 'touch grass :P', 'lowkey sleepy', 'cool decisions only xo', 'hmm', 'nice wallpaper'],
  pjoy: ['omg pjoys XD', 'pjoy time <3', 'cozy!!'],
  socks: ['SOCKS!!! <3', 'need those lol', 'sock squad'],
  other: ['cute!!', 'ok wait i like this', '<3', 'fit check :P'],
  bagOpen: ['ooh whats in there', 'peek :P'],
  games: ['game time XD', 'lemme play', ':P'],
  wallpaper: ['ooh new view', 'pretty!!'],
  wake: ['...huh?', 'im up im up', 'yawn'],
  leave: ['bye xx', 'cya <3'],
} as const;
export type LineKind = keyof typeof LINES;

export const bagLines = (kind: BagKind) => (kind === 'pjoy' ? LINES.pjoy : kind === 'socks' ? LINES.socks : LINES.other);

/** Pjoys / socks / anything else, from the product's own handle and title (no invented facts). */
export function bagKind(handle: string, title = ''): BagKind {
  const t = `${handle} ${title}`.toLowerCase();
  if (/pjoy|pajama|pyjama/.test(t)) return 'pjoy';
  if (/sock/.test(t)) return 'socks';
  return 'other';
}

/** Words Catchy must never say (checked by a unit test). */
export const BANNED = /buy now|only \d+ left|you need this|sale ending|add more|checkout now|how can i (help|assist)|based on your preferences|would you like to shop/i;
