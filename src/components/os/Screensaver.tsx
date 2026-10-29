import { useEffect, useRef, useState } from 'react';
import { brand, curation, localImage } from '../../data/assets';
import { prefersReducedMotion } from '../../lib/motion';

const IDLE_MS = 60_000;

/** Original screensaver: the IYS mark + real product photos drifting. Any input exits. */
export function Screensaver({ disabled }: { disabled: boolean }) {
  const [on, setOn] = useState(false);
  const timer = useRef<number>(0);

  useEffect(() => {
    if (disabled) return;
    const reset = () => {
      setOn(false);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setOn(true), IDLE_MS);
    };
    const events = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      window.clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [disabled]);

  if (!on || disabled) return null;
  return <Saver />;
}

function Saver() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = prefersReducedMotion();
  const items = [brand.markWhite, ...curation.screensaver.map((h) => localImage(h)?.src).filter(Boolean)] as string[];

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const nodes = [...el.querySelectorAll<HTMLElement>('.screensaver__item')];
    const state = nodes.map((_, i) => ({ x: 80 + i * 170, y: 60 + ((i * 137) % 300), vx: i % 2 ? 1.1 : -1.3, vy: i % 3 ? 0.9 : -1 }));
    let raf = 0;
    const tick = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      nodes.forEach((n, i) => {
        const s = state[i]!;
        const w = n.offsetWidth;
        const h = n.offsetHeight;
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0 || s.x + w > W) s.vx *= -1;
        if (s.y < 0 || s.y + h > H) s.vy *= -1;
        n.style.transform = `translate(${s.x}px, ${s.y}px)`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return (
    <div ref={ref} className="screensaver" aria-hidden="true">
      {items.map((src, i) => (
        <div key={src} className="screensaver__item" style={reduced ? { transform: `translate(${60 + i * 190}px, ${120 + (i % 2) * 160}px)` } : undefined}>
          <img src={src} alt="" className={i === 0 ? 'screensaver__logo' : undefined} />
        </div>
      ))}
      <p className="screensaver__hint">IYS OS SCREENSAVER - move the mouse or press any key</p>
    </div>
  );
}
