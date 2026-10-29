import gsap from 'gsap';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { brand } from '../../data/assets';
import { concept } from '../../data/copy';
import { play } from '../../lib/sound';
import { prefersReducedMotion } from '../../lib/motion';

/**
 * Boot: black → CRT dot → horizontal flash → POST lines → "TIME TARGET: 2006"
 * with the current IYS logo → desktop. ~2.1 s. SKIP always available;
 * reduced motion gets a 250 ms fade.
 */
export function Boot({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState(0);
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      setLines(concept.boot.lines.length);
      const t = gsap.to(el, { opacity: 0, duration: 0.25, delay: 0.35, onComplete: finish });
      return () => {
        t.kill();
      };
    }
    const q = gsap.utils.selector(el);
    // Wall-clock boot: after a main-thread stall (e.g. a slow machine parsing
    // the catalogue chunk) jump ahead instead of stretching the boot.
    gsap.ticker.lagSmoothing(0);
    const tl = gsap.timeline({ onComplete: finish });
    tl.set(q('.boot__screen'), { opacity: 0 })
      .fromTo(q('.boot__dot'), { scale: 0, opacity: 1 }, { scale: 1, duration: 0.12, ease: 'power2.out' })
      .to(q('.boot__dot'), { scaleX: 60, scaleY: 0.25, duration: 0.12, ease: 'power3.in' })
      .to(q('.boot__dot'), { scaleY: 40, opacity: 0, duration: 0.14, ease: 'power2.out' })
      .set(q('.boot__screen'), { opacity: 1 }, '<')
      .call(() => play('boot'))
      .to({}, { duration: 0.08 });
    concept.boot.lines.forEach((_, i) => tl.call(() => setLines(i + 1)).to({}, { duration: 0.14 }));
    tl.fromTo(q('.boot__target'), { opacity: 0 }, { opacity: 1, duration: 0.08 })
      .call(() => play('modem'))
      .fromTo(q('.boot__bar'), { '--p': '0%' }, { '--p': '100%', duration: 0.6, ease: 'steps(12)' })
      .to(el, { opacity: 0, duration: 0.18 });
    return () => {
      tl.kill();
      gsap.ticker.lagSmoothing(500, 33);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={root} className="boot" role="status" aria-live="polite" aria-label="IYS OS is starting">
      <div className="boot__dot" aria-hidden="true" />
      <div className="boot__screen">
        <p className="boot__machine">{concept.boot.machine}</p>
        <p className="boot__sub">IYS OS · build 2026 · target 2006</p>
        <ul className="boot__lines">
          {concept.boot.lines.slice(0, lines).map(([k, v]) => (
            <li key={k}>
              <span>{k}</span>
              <span className="boot__dots" aria-hidden="true" />
              <b>{v}</b>
            </li>
          ))}
        </ul>
        <div className="boot__target">
          <img src={brand.wordmarkWhite} alt="In Your Shoe" className="boot__logo" />
          <p>{concept.boot.target}</p>
          <p className="boot__connecting">{concept.boot.connecting}</p>
          <div className="progress boot__bar" style={{ ['--p' as string]: '0%' }}>
            <div className="progress__bar" />
          </div>
        </div>
      </div>
      <button type="button" className="boot__skip" onClick={finish}>
        {concept.boot.skip} ▸
      </button>
    </div>
  );
}
