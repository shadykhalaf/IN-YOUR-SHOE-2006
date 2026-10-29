import type { Rng } from '../../games/shared/rng';
import { bagLines, LINES, type LineKind } from './lines';
import type { Action, CatchyEvent, Mood, PetState } from './types';

/**
 * Catchy's brain: a small, pure, injectable-clock state machine. No AI, no
 * network. The charm comes from restraint: long quiet stretches, rare idle
 * chatter, cooldowns on everything.
 */
export const TIMING = {
  /** < calm: just idle / blink / look. */
  calmMs: 30_000,
  /** ≥ sit: sits down, gets sleepy. */
  sitMs: 90_000,
  /** ≥ sleep: falls asleep (only real activity wakes him). */
  sleepMs: 180_000,
  idleSpeechCooldownMs: 90_000,
  speechCooldownMs: 6_000,
  bagSpeechCooldownMs: 20_000,
  cursorStepCooldownMs: 20_000,
  cursorRadius: 160,
  followChance: 0.2,
} as const;

export interface Brain {
  state: PetState;
  mood: Mood;
  /** Last meaningful activity (not every mouse move). */
  lastActive: number;
  lastSpeech: number;
  lastIdleSpeech: number;
  lastBagSpeech: number;
  lastCursorStep: number;
  /** Mood boosts fade back to normal at this time. */
  moodUntil: number;
}

export interface Ctx {
  now: number;
  rng: Rng;
  reducedMotion: boolean;
  /** document.hidden */
  hidden: boolean;
  enabled: boolean;
  /** A game is focused, a critical dialog is open or the visitor is checking out: stay quiet. */
  quiet: boolean;
}

export function createBrain(now: number, state: PetState = 'sit'): Brain {
  return { state, mood: 'normal', lastActive: now, lastSpeech: -Infinity, lastIdleSpeech: now, lastBagSpeech: -Infinity, lastCursorStep: -Infinity, moodUntil: 0 };
}

const pick = <T,>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length) % list.length]!;

export function currentMood(b: Brain, now: number): Mood {
  if (b.moodUntil > now) return b.mood;
  if (now - b.lastActive >= TIMING.sitMs) return 'sleepy';
  return 'normal';
}

function setMood(b: Brain, mood: Mood, now: number, ms = 20_000) {
  b.mood = mood;
  b.moodUntil = now + ms;
}

/** Say a line if the cooldown allows it; returns the line or undefined. */
function speak(b: Brain, ctx: Ctx, kind: LineKind | readonly string[], opts: { idle?: boolean; bag?: boolean; force?: boolean } = {}): string | undefined {
  if (ctx.hidden || !ctx.enabled) return undefined;
  if (!opts.force && ctx.now - b.lastSpeech < TIMING.speechCooldownMs) return undefined;
  if (opts.idle && (ctx.quiet || ctx.now - b.lastIdleSpeech < TIMING.idleSpeechCooldownMs)) return undefined;
  if (opts.bag && ctx.now - b.lastBagSpeech < TIMING.bagSpeechCooldownMs) return undefined;
  const line = pick(ctx.rng, typeof kind === 'string' ? LINES[kind] : kind);
  b.lastSpeech = ctx.now;
  if (opts.idle) b.lastIdleSpeech = ctx.now;
  if (opts.bag) b.lastBagSpeech = ctx.now;
  return line;
}

const apply = (b: Brain, a: Action): Action => {
  b.state = a.state;
  return a;
};

/** The next quiet-time choice. Returns null when Catchy should do nothing at all (disabled / hidden tab). */
export function nextIdle(b: Brain, ctx: Ctx): Action | null {
  if (!ctx.enabled || ctx.hidden) return null;
  const inactive = ctx.now - b.lastActive;
  if (b.state === 'sleep' || inactive >= TIMING.sleepMs) return apply(b, { state: 'sleep', holdMs: 30_000, symbol: 'zzz' });
  if (inactive >= TIMING.sitMs) return apply(b, { state: 'sit', holdMs: 20_000 });
  const mood = currentMood(b, ctx.now);
  const r = ctx.rng();
  const roam = !ctx.reducedMotion;
  const calm = inactive < TIMING.calmMs;
  const say = ctx.rng() < 0.12 ? speak(b, ctx, 'idle', { idle: true }) : undefined;
  let a: Action;
  if (roam && mood === 'playful' && r < 0.25) a = { state: 'run', move: { pace: 'run', to: 'wander' }, holdMs: 2_500 };
  else if (roam && r < (calm ? 0.2 : 0.35)) a = { state: 'walk', move: { pace: 'walk', to: 'wander' }, holdMs: 3_000 };
  else if (r < (calm ? 0.55 : 0.6)) a = { state: 'look', holdMs: 2_500 };
  else if (!calm && r < 0.75) a = { state: 'sit', holdMs: 9_000 };
  else if (!calm && r < 0.8) a = { state: 'stretch', holdMs: 1_600 };
  else a = { state: 'idle', holdMs: 6_000 + Math.floor(ctx.rng() * 6_000) };
  return apply(b, { ...a, say });
}

/** Something meaningful happened: Catchy notices (and wakes up if asleep). */
export function react(b: Brain, e: CatchyEvent | { type: 'poke' } | { type: 'drag:start' } | { type: 'drag:end' }, ctx: Ctx): Action | null {
  if (!ctx.enabled) return null;
  const wasAsleep = b.state === 'sleep';
  b.lastActive = ctx.now;
  const move = (to: NonNullable<Action['move']>['to'], pace: 'walk' | 'run' = 'walk') => (ctx.reducedMotion ? undefined : { pace, to });
  switch (e.type) {
    case 'drag:start':
      return apply(b, { state: 'dragged', holdMs: 60_000 });
    case 'drag:end':
      return apply(b, { state: 'sit', holdMs: 6_000 });
    case 'poke':
      if (wasAsleep) return apply(b, { state: 'wake', holdMs: 1_400, symbol: '?', say: speak(b, ctx, 'wake', { force: true }) });
      return apply(b, { state: 'happy', holdMs: 1_400, symbol: '<3', say: ctx.now - b.lastSpeech > 2_500 ? speak(b, ctx, 'greet', { force: true }) : undefined });
    case 'bag:add': {
      setMood(b, 'excited', ctx.now);
      const state: PetState = e.kind === 'pjoy' ? 'carry-pjoy' : e.kind === 'socks' ? 'carry-sock' : 'excited';
      return apply(b, { state, move: move('visible', 'run'), holdMs: 2_600, symbol: '!!', say: speak(b, ctx, bagLines(e.kind), { bag: true, force: true }) });
    }
    case 'bag:open':
      setMood(b, 'curious', ctx.now);
      return apply(b, { state: 'curious', move: move('bag'), holdMs: 4_000, symbol: '?', say: ctx.rng() < 0.5 ? speak(b, ctx, 'bagOpen') : undefined });
    case 'games:open':
    case 'game:start':
      setMood(b, 'playful', ctx.now, 60_000);
      return apply(b, { state: 'happy', holdMs: 2_000, symbol: '<3', say: speak(b, ctx, 'games') });
    case 'wallpaper:change':
      setMood(b, 'curious', ctx.now);
      return apply(b, { state: 'look', holdMs: 2_400, say: ctx.rng() < 0.4 ? speak(b, ctx, 'wallpaper') : undefined });
    case 'real-iys:leave':
      return apply(b, { state: 'wave', holdMs: 1_200, say: speak(b, ctx, 'leave', { force: true }) });
  }
}

/** May the REAL IYS hand-off wait (≤ 300 ms) for a visible goodbye wave? */
export const canWave = (ctx: Pick<Ctx, 'enabled' | 'hidden' | 'reducedMotion'>, onScreen: boolean) => ctx.enabled && !ctx.hidden && !ctx.reducedMotion && onScreen;

/**
 * The cursor came near. Catchy turns to look; once in a while he takes one
 * or two steps toward it, then stops (never an endless chase). A sleeping
 * Catchy ignores it: mouse moves alone never wake him.
 */
export function cursorNear(b: Brain, dist: number, ctx: Ctx): { look: boolean; step: boolean } {
  if (!ctx.enabled || ctx.hidden || b.state === 'sleep' || b.state === 'dragged' || dist > TIMING.cursorRadius) return { look: false, step: false };
  const step = !ctx.reducedMotion && dist > 60 && ctx.now - b.lastCursorStep >= TIMING.cursorStepCooldownMs && ctx.rng() < TIMING.followChance;
  if (step) b.lastCursorStep = ctx.now;
  return { look: true, step };
}
