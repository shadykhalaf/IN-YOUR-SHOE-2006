/**
 * "COMPUTER SAYING NO?" - repeated presses that change nothing.
 *
 * A press is a quick tap/click (pointer up within 600 ms, moved < 12 px).
 * RAGE = 4 presses within 2 s, all within 48 px of the first, while the
 * visible state stayed exactly the same between them (same page, same bag,
 * same windows, same dialog, same screen title, same menu state). That is a
 * control that "does nothing" for this shopper: a disabled ADD TO BAG, a
 * picture that isn't a link, a stuck button.
 *
 * Never counted: drags/swipes/scrolling, scrollbar presses, typing and form
 * fields, games while they are on screen, Catchy, and controls that are meant
 * to be pressed again and again ([data-repeatable]: quantity steppers,
 * carousel arrows, zoom). Pointer + touch events are used because browsers do
 * not fire `click` on disabled buttons. Nothing is stored or sent anywhere.
 */
export const RAGE = { presses: 4, withinMs: 2000, radiusPx: 48 } as const;
const TAP_MAX_MS = 600;
const TAP_MAX_MOVE = 12;

export interface Press {
  x: number;
  y: number;
  at: number;
  /** The visible state just before this press (see `fingerprint`). */
  print: string;
}

/** Pure: do the latest presses form a burst of ineffective presses? */
export function isRage(presses: readonly Press[], rule: { presses: number; withinMs: number; radiusPx: number } = RAGE): boolean {
  if (presses.length < rule.presses) return false;
  const burst = presses.slice(-rule.presses);
  const first = burst[0]!;
  const last = burst[burst.length - 1]!;
  if (last.at - first.at > rule.withinMs) return false;
  return burst.every((p) => Math.hypot(p.x - first.x, p.y - first.y) <= rule.radiusPx && p.print === first.print);
}

export const IGNORE =
  'input, textarea, select, option, [contenteditable], [data-repeatable], [role="slider"], section.game, .m-gamescreen, .cpet, canvas, .gallery__stage, .m-gallery';

/** True when the pointer is on an element's own scrollbar rather than its content. */
const onScrollbar = (e: PointerEvent, el: Element) => e.offsetX > el.clientWidth + 1 || e.offsetY > el.clientHeight + 1;

/**
 * Watch the whole document for rage presses. `print` describes the visible
 * state; `onRage` gets a short description of what was pressed.
 * Returns a stop function.
 */
export function startRageWatch(print: () => string, onRage: (what: string) => void, isBusy: () => boolean = () => false): () => void {
  let presses: Press[] = [];
  let down: { x: number; y: number; at: number; target: Element; print: string } | null = null;
  let lastPress = 0;

  const describe = (el: Element) => {
    const c = el.closest('button, a, [role="button"], img, label, [data-window], section, li') ?? el;
    const text = (c.getAttribute('aria-label') ?? c.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
    return `${c.tagName.toLowerCase()}${text ? `:${text}` : ''}`;
  };

  const start = (x: number, y: number, target: EventTarget | null) => {
    if (!(target instanceof Element) || target.closest(IGNORE) || isBusy()) {
      down = null;
      return;
    }
    down = { x, y, at: Date.now(), target, print: print() };
  };
  const end = (x: number, y: number) => {
    const d = down;
    down = null;
    if (!d) return;
    const now = Date.now();
    if (now - d.at > TAP_MAX_MS || Math.hypot(x - d.x, y - d.y) > TAP_MAX_MOVE) return; // a drag, swipe or long press
    if (now - lastPress < 60) return; // the same tap reported as both pointer and touch
    lastPress = now;
    presses = [...presses.filter((p) => now - p.at <= RAGE.withinMs), { x: d.x, y: d.y, at: d.at, print: d.print }];
    if (isRage(presses)) {
      presses = [];
      onRage(describe(d.target));
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    if (e.target instanceof Element && onScrollbar(e, e.target)) return;
    start(e.clientX, e.clientY, e.target);
  };
  const onPointerUp = (e: PointerEvent) => end(e.clientX, e.clientY);
  const onPointerCancel = () => (down = null);
  // Some touch browsers don't send pointer events to disabled controls; touch events always reach them.
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    if (t && !down) start(t.clientX, t.clientY, e.target);
  };
  const onTouchEnd = (e: TouchEvent) => {
    const t = e.changedTouches[0];
    if (t) end(t.clientX, t.clientY);
  };
  const opts = { capture: true, passive: true } as const;
  document.addEventListener('pointerdown', onPointerDown, opts);
  document.addEventListener('pointerup', onPointerUp, opts);
  document.addEventListener('pointercancel', onPointerCancel, opts);
  document.addEventListener('touchstart', onTouchStart, opts);
  document.addEventListener('touchend', onTouchEnd, opts);
  return () => {
    document.removeEventListener('pointerdown', onPointerDown, opts);
    document.removeEventListener('pointerup', onPointerUp, opts);
    document.removeEventListener('pointercancel', onPointerCancel, opts);
    document.removeEventListener('touchstart', onTouchStart, opts);
    document.removeEventListener('touchend', onTouchEnd, opts);
  };
}
