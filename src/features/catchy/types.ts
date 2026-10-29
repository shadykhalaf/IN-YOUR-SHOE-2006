/** CATCHY desktop buddy — shared types. */
export type PetState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'sit'
  | 'sleep'
  | 'wake'
  | 'stretch'
  | 'look'
  | 'happy'
  | 'excited'
  | 'curious'
  | 'surprised'
  | 'dragged'
  | 'peek'
  | 'carry-sock'
  | 'carry-pjoy'
  | 'wave';

/** Tiny mood layer: only nudges idle choices, speech and movement frequency. */
export type Mood = 'normal' | 'sleepy' | 'curious' | 'excited' | 'playful';
export type BagKind = 'pjoy' | 'socks' | 'other';
export type Symbol = '!!' | '?' | '<3' | 'zzz';

export interface Vec {
  x: number;
  y: number;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Things that happen in the OS that Catchy may notice (fire-and-forget). */
export type CatchyEvent =
  | { type: 'bag:add'; kind: BagKind }
  | { type: 'bag:open' }
  | { type: 'games:open' }
  | { type: 'game:start' }
  | { type: 'wallpaper:change' }
  | { type: 'real-iys:leave' };

/** What the behaviour layer asks the view to do next. */
export interface Action {
  state: PetState;
  /** Move somewhere: a random legal spot, a calm resting spot, a spot not under windows, or near MY BAG. */
  move?: { pace: 'walk' | 'run'; to: 'wander' | 'rest' | 'visible' | 'bag' | 'cursor' };
  /** How long to hold the pose before the next decision (ms). */
  holdMs: number;
  say?: string;
  symbol?: Symbol;
}
