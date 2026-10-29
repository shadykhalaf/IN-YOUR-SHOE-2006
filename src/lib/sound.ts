/**
 * Original synthesized UI sounds (Web Audio API). No samples, no recordings,
 * nothing borrowed from any operating system or messenger.
 *
 * - OFF by default; nothing is created until the user turns sound on (a
 *   user gesture), which also satisfies Safari/iOS autoplay rules.
 * - Every sound is < 0.6 s. Nothing loops.
 */
import { usePreferences } from '../state/preferences';

export type Sfx = 'boot' | 'click' | 'open' | 'close' | 'minimize' | 'ping' | 'error' | 'done' | 'shutter' | 'modem';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Call from the click handler that turns sound on (unlocks iOS audio). */
export function unlockAudio() {
  const a = audio();
  if (!a || !master) return;
  const b = a.createBuffer(1, 1, 22050);
  const s = a.createBufferSource();
  s.buffer = b;
  s.connect(master);
  s.start(0);
}

export function stopAudio() {
  if (ctx) {
    void ctx.close();
    ctx = null;
    master = null;
  }
}

function tone(a: AudioContext, out: AudioNode, { f, f2, t0, d, type = 'square', v = 0.5 }: { f: number; f2?: number; t0: number; d: number; type?: OscillatorType; v?: number }) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g).connect(out);
  o.start(t0);
  o.stop(t0 + d + 0.02);
}

function noise(a: AudioContext, out: AudioNode, t0: number, d: number, v = 0.4, hp = 1200) {
  const len = Math.floor(a.sampleRate * d);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  let seed = 7;
  for (let i = 0; i < len; i++) {
    seed = (seed * 16807) % 2147483647;
    data[i] = ((seed / 2147483647) * 2 - 1) * (1 - i / len);
  }
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  const g = a.createGain();
  g.gain.value = v;
  src.connect(f).connect(g).connect(out);
  src.start(t0);
}

export function play(name: Sfx) {
  if (!usePreferences.getState().sound) return;
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime + 0.005;
  const m = master;
  switch (name) {
    case 'click':
      tone(a, m, { f: 1800, t0: t, d: 0.025, type: 'square', v: 0.25 });
      break;
    case 'open':
      tone(a, m, { f: 520, f2: 880, t0: t, d: 0.09, type: 'triangle', v: 0.35 });
      break;
    case 'close':
      tone(a, m, { f: 760, f2: 420, t0: t, d: 0.08, type: 'triangle', v: 0.3 });
      break;
    case 'minimize':
      tone(a, m, { f: 900, f2: 300, t0: t, d: 0.12, type: 'sine', v: 0.3 });
      break;
    case 'ping':
      tone(a, m, { f: 1320, t0: t, d: 0.12, type: 'sine', v: 0.4 });
      tone(a, m, { f: 1760, t0: t + 0.09, d: 0.2, type: 'sine', v: 0.35 });
      break;
    case 'error':
      tone(a, m, { f: 220, t0: t, d: 0.16, type: 'square', v: 0.28 });
      tone(a, m, { f: 180, t0: t + 0.14, d: 0.2, type: 'square', v: 0.24 });
      break;
    case 'done':
      [660, 880, 1320].forEach((f, i) => tone(a, m, { f, t0: t + i * 0.07, d: 0.12, type: 'triangle', v: 0.3 }));
      break;
    case 'shutter':
      noise(a, m, t, 0.05, 0.5, 2500);
      noise(a, m, t + 0.07, 0.06, 0.35, 1800);
      break;
    case 'boot':
      [392, 523, 659, 1047].forEach((f, i) => tone(a, m, { f, t0: t + i * 0.085, d: 0.22, type: 'triangle', v: 0.28 }));
      break;
    case 'modem':
      // A short, stylised "connecting" impression — not a recording of any real handshake.
      tone(a, m, { f: 1650, t0: t, d: 0.12, type: 'sine', v: 0.2 });
      tone(a, m, { f: 980, f2: 2100, t0: t + 0.12, d: 0.18, type: 'sawtooth', v: 0.08 });
      noise(a, m, t + 0.28, 0.22, 0.12, 900);
      break;
  }
}

/**
 * One short original game blip (IYS GAMES). Same rules as every UI sound:
 * silent unless the visitor turned sound on, never longer than 0.6 s.
 */
export function blip(f: number, d = 0.08, type: OscillatorType = 'square', f2?: number, v = 0.22) {
  if (!usePreferences.getState().sound) return;
  const a = audio();
  if (!a || !master) return;
  tone(a, master, { f, f2, t0: a.currentTime + 0.005, d: Math.min(d, 0.6), type, v });
}
