import CATCHY_PNG from './catchy.png';

/**
 * CATCHY — the canonical mascot art is the official reference itself: the
 * actual Catchy pixels cut out of the supplied pin photo (background removed,
 * an even white sticker ring added back around the traced outline). No
 * redrawing, no reinterpretation. Every Catchy on the site (IYS GAMES, canvas
 * games, Purbale Catchy, Control Panel, the desktop / mobile buddy) uses this
 * one image. It is ~136 × 127 px: crisp at the sizes it is shown (≤ 128 px).
 * See /catchy-compare (dev only) for the reference / cut-out / overlay check.
 */
export const CATCHY_URI: string = CATCHY_PNG;
export const CATCHY_SIZE = { w: 136, h: 127 } as const;
export const CATCHY_RATIO = CATCHY_SIZE.w / CATCHY_SIZE.h;
/** Fallback colours (canvas placeholder before the image decodes), sampled from the reference. */
export const INK = '#151515';
export const COLORS = { teal: '#3e9c88' } as const;
