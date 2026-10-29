import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { concept } from '../../data/copy';
import { sized } from '../../lib/catalogue/images';
import { prefersReducedMotion } from '../../lib/motion';
import { useOS } from '../../state/os';
import { usePreferences } from '../../state/preferences';
import { useTransfer } from '../../state/status';
import { Icon } from './Icon';

/** Decorative CRT layer — strong during boot, subtle after, user-toggleable. */
export function CRT({ boot }: { boot: boolean }) {
  const on = usePreferences((s) => s.crt);
  if (!on && !boot) return null;
  return <div className={`crt${boot ? ' crt--boot' : ''}`} aria-hidden="true" />;
}

/** Tray notification balloon (one at a time, dismissible, never blocks). */
export function Balloon({ onOpen }: { onOpen: () => void }) {
  const balloon = useOS((s) => s.balloon);
  const showBalloon = useOS((s) => s.showBalloon);
  useEffect(() => {
    if (!balloon) return;
    const t = window.setTimeout(() => showBalloon(null), 14_000);
    return () => window.clearTimeout(t);
  }, [balloon, showBalloon]);
  if (!balloon) return null;
  return (
    <div className="balloon" role="status" aria-live="polite">
      {typeof balloon.props?.photo === 'string' && <img className="balloon__photo" src={balloon.props.photo} alt="" />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong>{balloon.title}</strong>
        <p>{balloon.text}</p>
        <button type="button" className="btn btn--small" style={{ marginTop: 6 }} onClick={onOpen}>
          Open conversation
        </button>
      </div>
      <button type="button" className="tbtn tbtn--close balloon__close" aria-label="Dismiss notification" onClick={() => showBalloon(null)}>
        <svg viewBox="0 0 10 10" shapeRendering="crispEdges" aria-hidden="true">
          <path d="M0 0h2v1h1v1h1v1h2V2h1V1h1V0h2v2H9v1H8v1H7v2h1v1h1v1h1v2H8V9H7V8H6V7H4v1H3v1H2v1H0V8h1V7h1V6h1V4H2V3H1V2H0z" fill="#fff" />
        </svg>
      </button>
    </div>
  );
}

/**
 * "COPYING ITEM TO: MY BAG" — a period file-transfer dialog. Purely a
 * confirmation: the item is already in the bag when this appears, and it
 * finishes in < 1 s (instant with reduced motion).
 */
export function TransferDialog() {
  const item = useTransfer((s) => s.item);
  const at = useTransfer((s) => s.at);
  const done = useTransfer((s) => s.done);
  const [pct, setPct] = useState(0);
  const bar = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!item) return;
    const reduced = prefersReducedMotion();
    const total = reduced ? 1 : 620;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / total);
      setPct(Math.round(p * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const t = window.setTimeout(done, reduced ? 900 : 1200);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [item, at, done]);

  if (!item) return null;
  const complete = pct >= 100;
  return (
    <div className="transfer" role="status" aria-live="polite">
      <div className="titlebar">
        <Icon name="bag" size={16} className="titlebar__icon" />
        <p className="titlebar__title">{complete ? concept.itemAdded : 'Copying...'}</p>
      </div>
      <div className="transfer__body">
        <div className="transfer__anim" aria-hidden="true">
          <Icon name="product" size={32} />
          <span className={`fly-file transfer__file${complete ? ' is-done' : ''}`}>
            {item.image ? <img src={sized(item.image, 120)} alt="" /> : <Icon name="image" size={24} />}
          </span>
          <Icon name="bag" size={32} />
        </div>
        <p>
          {concept.copying} <b>MY BAG</b>
        </p>
        <p className="transfer__name">
          {item.title}
          {item.variant ? ` - ${item.variant}` : ''}
        </p>
        <div className="progress" style={{ ['--p' as string]: `${pct}%` }} ref={bar}>
          <div className="progress__bar" />
        </div>
        <p className="transfer__pct">{complete ? `100% - ${concept.itemAdded}` : `${pct}%`}</p>
      </div>
    </div>
  );
}

export interface MenuItem {
  label: string;
  onSelect?: () => void;
  href?: string;
  isDefault?: boolean;
  separator?: boolean;
}

/**
 * Accessible image-action menu (opened by right-click, the ☰ button, or
 * Shift+F10). Does not disable the browser's own context menu elsewhere.
 */
export function ContextMenu({ x, y, items, onClose, label }: { x: number; y: number; items: MenuItem[]; onClose: () => void; label: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const [pos, setPos] = useState({ x, y });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ x: Math.min(x, window.innerWidth - r.width - 4), y: Math.min(y, window.innerHeight - r.height - 4) });
    el.querySelector<HTMLElement>('button, a')?.focus();
  }, [x, y]);
  useEffect(() => {
    const down = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose();
    window.addEventListener('mousedown', down);
    window.addEventListener('blur', onClose);
    return () => {
      window.removeEventListener('mousedown', down);
      window.removeEventListener('blur', onClose);
    };
  }, [onClose]);
  const onKeyDown = (e: React.KeyboardEvent) => {
    const els = [...(ref.current?.querySelectorAll<HTMLElement>('button, a') ?? [])];
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      els[(i + 1) % els.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      els[(i - 1 + els.length) % els.length]?.focus();
    }
  };
  return (
    <ul ref={ref} className="ctxmenu" role="menu" aria-label={label} style={{ left: pos.x, top: pos.y }} onKeyDown={onKeyDown}>
      {items.map((it, i) =>
        it.separator ? (
          <li key={`s${i}`} role="separator">
            <hr />
          </li>
        ) : (
          <li key={it.label} role="none">
            {it.href ? (
              <a role="menuitem" href={it.href} target="_blank" rel="noopener noreferrer" onClick={onClose}>
                {it.label}
              </a>
            ) : (
              <button
                type="button"
                role="menuitem"
                className={it.isDefault ? 'is-default' : undefined}
                onClick={() => {
                  onClose();
                  it.onSelect?.();
                }}
              >
                {it.label}
              </button>
            )}
          </li>
        ),
      )}
    </ul>
  );
}
