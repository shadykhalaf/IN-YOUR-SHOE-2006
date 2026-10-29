import { createPortal } from 'react-dom';
import { Component, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { blip } from '../../lib/sound';
import { prefersReducedMotion } from '../../lib/motion';
import { useOS } from '../../state/os';
import { makeRng } from '../../games/shared/rng';
import { startCatchyAdapters } from './adapters';
import { canWave, createBrain, cursorNear, nextIdle, react, type Brain, type Ctx } from './behaviour';
import { CatchySprite } from './CatchySprite';
import { catchyEvents } from './events';
import { besideRect, clampTo, DESKTOP_SIZE, legalBounds, MOBILE_SIZE, restSpot, SPEED, stepToward, visibleFraction, wanderTarget, type Size } from './movement';
import { readPosition, writeEnabled, writePosition } from './storage';
import type { Action, PetState, Rect, Symbol, Vec } from './types';
import './catchy.css';

type Mode = 'desktop' | 'mobile';
type Target = { pos: Vec; pace: 'walk' | 'run'; then: PetState };

const rng = () => Math.random();

/** Keeps any Catchy failure inside Catchy: the OS around him never notices. */
class CatchyBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    // decoration only: swallow
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Rects (relative to `layer`) of things Catchy shouldn't rest on or hide behind. */
function measure(layer: HTMLElement | null) {
  const base = layer?.getBoundingClientRect();
  if (!layer || !base) return { icons: [] as Rect[], windows: [] as Rect[] };
  const rel = (r: DOMRect): Rect => ({ x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height });
  const desk = layer.closest('.desktop');
  const pad = (r: Rect): Rect => ({ x: r.x - 6, y: r.y - 6, w: r.w + 12, h: r.h + 12 });
  // icons (with a little breathing room) and the desktop stamp text: places he shouldn't park on
  const icons = [...(desk?.querySelectorAll<HTMLElement>('.dicon, .desktop__stamp') ?? [])].map((e) => pad(rel(e.getBoundingClientRect())));
  const windows = [...(desk?.querySelectorAll<HTMLElement>('.win-layer .win') ?? [])].filter((e) => e.offsetParent !== null).map((e) => rel(e.getBoundingClientRect()));
  return { icons, windows };
}

function Pet({ mode }: { mode: Mode }) {
  const size: Size = mode === 'desktop' ? DESKTOP_SIZE : MOBILE_SIZE;
  const layer = useRef<HTMLDivElement>(null);
  const node = useRef<HTMLDivElement>(null);
  const area = useRef<Size>({ w: 0, h: 0 });
  const pos = useRef<Vec>({ x: 0, y: 0 });
  const brain = useRef<Brain>(createBrain(performance.now(), mode === 'desktop' ? 'sit' : 'idle'));
  const target = useRef<Target | null>(null);
  const raf = useRef(0);
  const timers = useRef(new Map<string, number>());
  const drag = useRef<{ id: number; dx: number; dy: number; x0: number; y0: number; moved: boolean } | null>(null);
  const reduced = useRef(prefersReducedMotion());
  const lastCursor = useRef(0);
  const suppressClick = useRef(false);
  const [pose, setPose] = useState<PetState>(brain.current.state);
  const [facing, setFacing] = useState<1 | -1>(-1);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const [bubble, setBubble] = useState<{ text: string; live: boolean } | null>(null);
  const [symbol, setSymbol] = useState<Symbol | null>(null);
  const [bounce, setBounce] = useState(0);
  const [menu, setMenu] = useState(false);
  const [menuAt, setMenuAt] = useState<{ left: number; top: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [flip, setFlip] = useState({ below: false, right: false });

  const later = (key: string, ms: number, fn: () => void) => {
    const t = timers.current;
    if (t.has(key)) window.clearTimeout(t.get(key));
    t.set(
      key,
      window.setTimeout(() => {
        t.delete(key);
        fn();
      }, ms),
    );
  };
  const cancel = (key: string) => {
    const t = timers.current.get(key);
    if (t !== undefined) window.clearTimeout(t);
    timers.current.delete(key);
  };

  const bubbleEl = useRef<HTMLParagraphElement>(null);
  /** Desktop bubbles float above windows (so a line is never half hidden) and follow Catchy. */
  const placeBubble = useCallback(() => {
    const b = bubbleEl.current;
    const base = layer.current?.getBoundingClientRect();
    if (!b || !base || mode !== 'desktop') return;
    const px = base.left + pos.current.x;
    const py = base.top + pos.current.y;
    const w = b.offsetWidth;
    const h = b.offsetHeight;
    const right = px + size.w + w > window.innerWidth - 8;
    const below = py - h - 12 < base.top;
    b.style.left = `${Math.round(Math.min(Math.max(4, right ? px + size.w - w - 6 : px + 6), window.innerWidth - w - 4))}px`;
    b.style.top = `${Math.round(below ? py + size.h + 10 : py - h - 10)}px`;
    b.classList.toggle('is-right', right);
    b.classList.toggle('is-below', below);
  }, [mode, size.w, size.h]);

  const place = useCallback(() => {
    const el = node.current;
    if (!el) return;
    el.style.transform = `translate(${Math.round(pos.current.x)}px, ${Math.round(pos.current.y)}px)`;
    placeBubble();
    const a = area.current;
    setFlip((f) => {
      // mobile: the bubble sits beside him on his little ledge
      const below = mode === 'desktop' && pos.current.y < 54;
      const right = mode === 'desktop' ? pos.current.x > a.w - 190 : pos.current.x > a.w / 2;
      return f.below === below && f.right === right ? f : { below, right };
    });
  }, []);

  const bounds = () => legalBounds(area.current, size);
  const ctx = (): Ctx => {
    const os = useOS.getState();
    const quiet = Boolean(os.dialog) || (os.activeId?.startsWith('game-') ?? false) || location.pathname.startsWith('/checkout');
    return { now: performance.now(), rng, reducedMotion: reduced.current, hidden: document.hidden, enabled: true, quiet };
  };
  const onScreen = () => {
    if (!area.current.w) return false;
    if (mode === 'mobile') return true;
    const r = { ...pos.current, ...size };
    return visibleFraction(r, measure(layer.current).windows) > 0.35;
  };

  const say = (text: string | undefined, live = false) => {
    if (!text) return;
    // no floating line over a window when Catchy himself is hidden behind it
    if (mode === 'desktop' && !live && !onScreen()) return;
    setBubble({ text, live });
    later('bubble', 2_800, () => setBubble(null));
  };
  const showSymbol = (s: Symbol | undefined) => {
    if (!s) return;
    setSymbol(s);
    later('symbol', s === 'zzz' ? 6_000 : 1_500, () => setSymbol(null));
  };

  const stopMoving = () => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    target.current = null;
  };

  const persist = () => {
    const b = bounds();
    if (mode === 'desktop' && b.w > 0 && b.h > 0) writePosition({ fx: pos.current.x / b.w, fy: pos.current.y / b.h });
  };

  const decideRef = useRef<() => void>(() => {});
  const schedule = (ms: number) => later('decide', ms, () => decideRef.current());

  const frame = (t0: number) => {
    let last = t0;
    const tick = (t: number) => {
      const tg = target.current;
      if (!tg || document.hidden) {
        raf.current = 0;
        return;
      }
      const res = stepToward(pos.current, tg.pos, SPEED[tg.pace], (t - last) / 1000);
      last = t;
      pos.current = clampTo(res.pos, bounds());
      if (res.dir) setFacing(res.dir as 1 | -1);
      place();
      if (res.arrived) {
        stopMoving();
        brain.current.state = tg.then;
        setPose(tg.then);
        persist();
        schedule(tg.then === 'sit' ? 8_000 : 4_000);
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  const moveTo = (to: NonNullable<Action['move']>['to'], pace: 'walk' | 'run', cursor?: Vec) => {
    const b = bounds();
    const { icons, windows } = mode === 'desktop' ? measure(layer.current) : { icons: [], windows: [] };
    let dest: Vec;
    if (mode === 'mobile') dest = clampTo({ x: pos.current.x + (rng() * 2 - 1) * 90, y: b.h }, b);
    else if (to === 'rest' || to === 'visible') dest = restSpot(b, size, windows, icons, pos.current.x > b.w / 2 ? 'right' : 'left');
    else if (to === 'bag') {
      const bag = useOS.getState().windows.find((w) => w.app === 'bag' && !w.minimized);
      dest = bag ? besideRect(b, size, bag.rect) : restSpot(b, size, windows, icons);
    } else if (to === 'cursor' && cursor) {
      const dx = Math.sign(cursor.x - pos.current.x) * Math.min(40, Math.abs(cursor.x - pos.current.x));
      dest = clampTo({ x: pos.current.x + dx, y: pos.current.y }, b);
    } else dest = wanderTarget(b, size, pos.current, makeRng((rng() * 2 ** 31) | 0), icons, mode === 'desktop' ? 280 : 90);
    stopMoving();
    if (Math.hypot(dest.x - pos.current.x, dest.y - pos.current.y) < 2) return false;
    setFacing(dest.x >= pos.current.x ? 1 : -1);
    target.current = { pos: dest, pace, then: to === 'cursor' ? 'look' : pace === 'run' ? 'happy' : to === 'bag' ? 'sit' : 'idle' };
    frame(performance.now());
    return true;
  };

  const apply = (a: Action | null, live = false) => {
    if (!a) return;
    setMenu(false);
    const moving = a.move && !reduced.current && moveTo(a.move.to, a.move.pace);
    setPose(moving ? (a.move!.pace === 'run' ? 'run' : 'walk') : a.state);
    if (moving && (a.state === 'carry-pjoy' || a.state === 'carry-sock')) setPose(a.state);
    say(a.say, live);
    showSymbol(a.symbol);
    if (!moving) schedule(a.holdMs);
  };

  decideRef.current = () => {
    if (document.hidden || drag.current) return;
    apply(nextIdle(brain.current, ctx()));
  };

  // area + initial spot
  useLayoutEffect(() => {
    const el = layer.current;
    if (!el) return;
    const measureArea = () => {
      area.current = { w: el.clientWidth, h: el.clientHeight };
      const b = bounds();
      if (!ready) {
        const saved = mode === 'desktop' ? readPosition() : null;
        if (saved) pos.current = clampTo({ x: saved.fx * b.w, y: saved.fy * b.h }, b);
        else if (mode === 'desktop') {
          const { icons, windows } = measure(el);
          pos.current = restSpot(b, size, windows, icons);
        } else pos.current = { x: b.w * 0.72, y: b.h };
      } else pos.current = clampTo(pos.current, b);
      place();
    };
    const ro = new ResizeObserver(measureArea);
    ro.observe(el);
    measureArea();
    setReady(true);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // life: first decision, blinking, tab visibility, events, cursor
  useEffect(() => {
    const t = timers.current;
    schedule(4_000);
    const blinkLoop = () =>
      later('blink', 2_800 + rng() * 4_500, () => {
        if (brain.current.state !== 'sleep') {
          setBlink(true);
          later('unblink', 140, () => setBlink(false));
        }
        blinkLoop();
      });
    blinkLoop();
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMq = () => {
      reduced.current = mq.matches;
      if (mq.matches) stopMoving();
    };
    mq.addEventListener('change', onMq);
    const onVis = () => {
      if (document.hidden) {
        stopMoving();
        for (const k of ['decide', 'blink', 'unblink']) cancel(k);
      } else {
        schedule(1_500);
        blinkLoop();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    const offEvents = catchyEvents.on((e) => {
      if (drag.current) return false;
      if (e.type === 'real-iys:leave') {
        const visible = onScreen();
        const ok = canWave({ enabled: true, hidden: document.hidden, reducedMotion: reduced.current }, visible);
        apply(react(brain.current, e, ctx()));
        return ok;
      }
      apply(react(brain.current, e, ctx()));
      if (e.type === 'bag:add') blip(1100, 0.08, 'triangle', 1500, 0.15);
      return false;
    });
    const offAdapters = startCatchyAdapters();
    const onMove = (ev: PointerEvent) => {
      if (mode !== 'desktop' || ev.pointerType !== 'mouse' || drag.current) return;
      const now = performance.now();
      if (now - lastCursor.current < 120) return;
      lastCursor.current = now;
      const base = layer.current?.getBoundingClientRect();
      if (!base) return;
      const c = { x: ev.clientX - base.left, y: ev.clientY - base.top };
      const cx = pos.current.x + size.w / 2;
      const cy = pos.current.y + size.h * 0.4;
      const res = cursorNear(brain.current, Math.hypot(c.x - cx, c.y - cy), ctx());
      if (!res.look) {
        setLook((l) => (l.x || l.y ? { x: 0, y: 0 } : l));
        return;
      }
      const d = Math.hypot(c.x - cx, c.y - cy) || 1;
      const nl = { x: Math.round(((c.x - cx) / d) * 2.5 * 2) / 2, y: Math.round(((c.y - cy) / d) * 2 * 2) / 2 };
      setLook((l) => (l.x === nl.x && l.y === nl.y ? l : nl));
      if (!target.current) setFacing(c.x >= cx ? 1 : -1);
      if (res.step && !target.current) moveTo('cursor', 'walk', c);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      stopMoving();
      t.forEach((id) => window.clearTimeout(id));
      t.clear();
      mq.removeEventListener('change', onMq);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove);
      offEvents();
      offAdapters();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const poke = () => {
    apply(react(brain.current, { type: 'poke' }, ctx()), true);
    setBounce((n) => n + 1);
    blip(brain.current.state === 'wake' ? 520 : 880, 0.06, 'triangle', 1180, 0.14);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const base = layer.current!.getBoundingClientRect();
    drag.current = { id: e.pointerId, dx: e.clientX - base.left - pos.current.x, dy: e.clientY - base.top - pos.current.y, x0: e.clientX, y0: e.clientY, moved: false };
    if (mode === 'desktop') e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || mode !== 'desktop') return;
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 5) return;
    if (!d.moved) {
      d.moved = true;
      stopMoving();
      cancel('decide');
      apply(react(brain.current, { type: 'drag:start' }, ctx()));
    }
    const base = layer.current!.getBoundingClientRect();
    pos.current = clampTo({ x: e.clientX - base.left - d.dx, y: e.clientY - base.top - d.dy }, bounds());
    place();
  };
  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId || !d.moved) return;
    suppressClick.current = true;
    window.setTimeout(() => (suppressClick.current = false), 0);
    pos.current = clampTo(pos.current, bounds());
    place();
    persist();
    setBounce((n) => n + 1);
    apply(react(brain.current, { type: 'drag:end' }, ctx()));
  };

  const nudge = (dx: number, dy: number) => {
    stopMoving();
    pos.current = clampTo({ x: pos.current.x + dx, y: pos.current.y + dy }, bounds());
    if (dx) setFacing(dx > 0 ? 1 : -1);
    place();
    persist();
  };

  const menuAction = (k: 'play' | 'nap' | 'games' | 'hide') => {
    setMenu(false);
    if (k === 'play') {
      brain.current.mood = 'playful';
      brain.current.moodUntil = performance.now() + 30_000;
      apply({ state: 'happy', move: reduced.current ? undefined : { pace: 'run', to: 'wander' }, holdMs: 2_000, symbol: '<3' }, true);
    } else if (k === 'nap') {
      brain.current.state = 'sleep';
      stopMoving();
      setPose('sleep');
      showSymbol('zzz');
      schedule(30_000);
    } else if (k === 'games') useOS.getState().open('games');
    else writeEnabled(false);
  };

  useLayoutEffect(() => placeBubble(), [bubble, placeBubble]);

  // the menu floats above windows (it's a control, unlike Catchy himself), kept on screen
  useLayoutEffect(() => {
    if (!menu) return setMenuAt(null);
    const r = node.current?.getBoundingClientRect();
    if (!r) return;
    const w = 124;
    const h = 112;
    const left = Math.min(Math.max(4, r.left + r.width * 0.6), window.innerWidth - w - 4);
    const top = r.top - h - 4 < 26 ? r.bottom + 4 : r.top - h - 4;
    setMenuAt({ left, top: Math.min(top, window.innerHeight - h - 40) });
    const close = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('.cpet__menu, .cpet__hit')) setMenu(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [menu]);

  const label = 'Catchy, IYS desktop buddy';
  return (
    <div ref={layer} className={`catchy-layer catchy-layer--${mode}`}>
      <div
        ref={node}
        className={`cpet cpet--${pose}${blink ? ' is-blink' : ''}${ready ? '' : ' is-hidden'}`}
        data-catchy-state={pose}
        data-facing={facing}
        style={{ width: size.w, height: size.h }}
      >
        <span className="cpet__shadow" aria-hidden="true" />
        <button
          type="button"
          className="cpet__hit"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={menu}
          onClick={() => {
            if (suppressClick.current) {
              suppressClick.current = false;
              return;
            }
            poke();
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (drag.current = null)}
          onContextMenu={(e) => {
            if (mode !== 'desktop') return;
            e.preventDefault();
            setMenu((m) => !m);
          }}
          onKeyDown={(e) => {
            const step = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[e.key];
            if (step && mode === 'desktop') {
              e.preventDefault();
              nudge(step[0]!, step[1]!);
            } else if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
              e.preventDefault();
              setMenu(true);
            } else if (e.key === 'Escape' && menu) {
              e.stopPropagation();
              setMenu(false);
            }
          }}
        >
          <span className="cpet__fig" key={bounce}>
            <CatchySprite pose={pose} look={facing === 1 ? look : { x: -look.x, y: look.y }} blink={blink} />
          </span>
        </button>
        {symbol && (
          <span className={`cpet__sym cpet__sym--${symbol === 'zzz' ? 'zzz' : 'pop'}`} aria-hidden="true">
            {symbol}
          </span>
        )}
        {bubble && mode === 'mobile' && (
          <p className={`cpet__bubble${flip.right ? ' is-right' : ''}`} role={bubble.live ? 'status' : undefined} aria-hidden={bubble.live ? undefined : true}>
            {bubble.text}
          </p>
        )}
        {bubble &&
          mode === 'desktop' &&
          createPortal(
            <p ref={bubbleEl} className="cpet__bubble cpet__bubble--float" role={bubble.live ? 'status' : undefined} aria-hidden={bubble.live ? undefined : true}>
              {bubble.text}
            </p>,
            document.body,
          )}
      </div>
        {menu && mode === 'desktop' && menuAt &&
          createPortal(
          <ul className="cpet__menu" role="menu" aria-label="CATCHY" style={menuAt} onKeyDown={(e) => e.key === 'Tab' && setMenu(false)}>
            <li role="presentation" className="cpet__menu-title">
              CATCHY
            </li>
            {(
              [
                ['play', 'Play :)'],
                ['nap', 'Nap'],
                ['games', 'IYS GAMES'],
                ['hide', 'Hide Catchy'],
              ] as const
            ).map(([k, t], i) => (
              <li key={k} role="presentation">
                <button
                  type="button"
                  role="menuitem"
                  autoFocus={i === 0}
                  onClick={() => menuAction(k)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.stopPropagation();
                      setMenu(false);
                      node.current?.querySelector<HTMLElement>('.cpet__hit')?.focus();
                    }
                  }}
                >
                  {t}
                </button>
              </li>
            ))}
          </ul>,
            document.body,
          )}
    </div>
  );
}

/** CATCHY.EXE — the IYS 2006 desktop buddy (desktop) or home-screen companion (mobile). */
export default function CatchyPet({ mode }: { mode: Mode }) {
  return (
    <CatchyBoundary>
      <Pet mode={mode} />
    </CatchyBoundary>
  );
}
