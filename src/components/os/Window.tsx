import gsap from 'gsap';
import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Rnd } from 'react-rnd';
import { play } from '../../lib/sound';
import { prefersReducedMotion } from '../../lib/motion';
import { useOS, type Win } from '../../state/os';
import { Icon, type IconName } from './Icon';
import { MenuBar, type MenuDef } from './MenuBar';

const MIN: Record<string, [number, number]> = {
  internet: [420, 320],
  messenger: [220, 300],
  bag: [300, 300],
  viewer: [320, 280],
  games: [360, 300],
  game: [340, 420],
};

/** Remember what had focus when each window opened, to restore it on close. */
const openers = new Map<string, Element | null>();

export function Window({
  win,
  icon,
  children,
  menubar,
  menus,
  statusbar,
  resizable = true,
  label,
}: {
  win: Win;
  icon: IconName;
  children: ReactNode;
  /** Decorative period menu labels. */
  menubar?: string[];
  /** Interactive menus (take precedence over `menubar`). */
  menus?: MenuDef[];
  statusbar?: ReactNode;
  resizable?: boolean;
  /** Accessible name when the visible title is decorative. */
  label?: string;
}) {
  const { focus, close, minimize, toggleMaximize, setRect, desk } = useOS.getState();
  const active = useOS((s) => s.activeId === win.id);
  const deskSize = useOS((s) => s.desk);
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Open animation + initial focus.
  useLayoutEffect(() => {
    if (!openers.has(win.id)) openers.set(win.id, document.activeElement);
    const el = ref.current;
    if (!el) return;
    if (!prefersReducedMotion()) {
      gsap.fromTo(el, { scale: 0.94, opacity: 0, transformOrigin: '50% 30%' }, { scale: 1, opacity: 1, duration: 0.16, ease: 'power2.out', clearProps: 'transform,opacity' });
    }
    play('open');
    requestAnimationFrame(() => {
      const target = el.querySelector<HTMLElement>('[data-autofocus]') ?? el;
      target.focus({ preventScroll: true });
    });
  }, [win.id, win.opened]);

  // Restore animation after being minimized.
  const wasMin = useRef(win.minimized);
  useEffect(() => {
    if (wasMin.current && !win.minimized && ref.current && !prefersReducedMotion()) {
      gsap.fromTo(ref.current, { y: 40, scale: 0.9, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.16, ease: 'power2.out', clearProps: 'transform,opacity' });
      ref.current.focus({ preventScroll: true });
    }
    wasMin.current = win.minimized;
  }, [win.minimized]);

  const doClose = () => {
    play('close');
    const back = openers.get(win.id);
    openers.delete(win.id);
    close(win.id);
    requestAnimationFrame(() => {
      if (back instanceof HTMLElement && back.isConnected) back.focus({ preventScroll: true });
      else document.querySelector<HTMLElement>('.start')?.focus({ preventScroll: true });
    });
  };
  const doMinimize = () => {
    play('minimize');
    const el = ref.current;
    if (!el || prefersReducedMotion()) return minimize(win.id);
    gsap.to(el, { y: desk.h * 0.6, scale: 0.3, opacity: 0, duration: 0.18, ease: 'power2.in', onComplete: () => {
      gsap.set(el, { clearProps: 'transform,opacity' });
      minimize(win.id);
    } });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !e.defaultPrevented) {
      const t = e.target as HTMLElement;
      if (t instanceof HTMLInputElement && t.value) return; // let the field clear itself first
      e.preventDefault();
      doClose();
    }
  };

  const [minW, minH] = MIN[win.app] ?? [260, 180];
  const max = win.maximized;

  return (
    <Rnd
      className="win-rnd"
      style={{ zIndex: win.z, display: win.minimized ? 'none' : undefined }}
      size={max ? { width: deskSize.w, height: deskSize.h } : { width: win.rect.w, height: win.rect.h }}
      position={max ? { x: 0, y: 0 } : { x: win.rect.x, y: win.rect.y }}
      bounds="parent"
      minWidth={Math.min(minW, deskSize.w)}
      minHeight={Math.min(minH, deskSize.h)}
      dragHandleClassName="titlebar"
      cancel=".tbtn"
      disableDragging={max}
      enableResizing={resizable && !max}
      resizeHandleClasses={{ bottomRight: 'rnd-handle', right: 'rnd-handle', bottom: 'rnd-handle' }}
      onDragStart={() => focus(win.id)}
      onDragStop={(_, d) => setRect(win.id, { x: d.x, y: d.y })}
      onResizeStart={() => focus(win.id)}
      onResizeStop={(_, __, el, ___, pos) => setRect(win.id, { w: el.offsetWidth, h: el.offsetHeight, x: pos.x, y: pos.y })}
    >
      <div
        ref={ref}
        className={`win win--${win.app}${active ? ' is-active' : ''}${max ? ' is-maximized' : ''}`}
        role="dialog"
        aria-modal="false"
        aria-labelledby={label ? undefined : titleId}
        aria-label={label}
        tabIndex={-1}
        data-window={win.id}
        onMouseDownCapture={() => !active && focus(win.id)}
        onFocusCapture={() => !active && focus(win.id)}
        onKeyDown={onKeyDown}
      >
        <div className="titlebar" onDoubleClick={() => resizable && toggleMaximize(win.id)}>
          <Icon name={icon} size={16} className="titlebar__icon" />
          <h2 className="titlebar__title" id={titleId}>
            {win.title}
          </h2>
          <div className="titlebar__buttons">
            <button type="button" className="tbtn" onClick={doMinimize} aria-label={`Minimize ${win.title}`} title="Minimize">
              <svg viewBox="0 0 10 10" shapeRendering="crispEdges" aria-hidden="true">
                <rect x="1" y="7" width="6" height="2" fill="#fff" />
              </svg>
            </button>
            {resizable && (
              <button type="button" className="tbtn" onClick={() => toggleMaximize(win.id)} aria-label={max ? `Restore ${win.title}` : `Maximize ${win.title}`} title={max ? 'Restore Down' : 'Maximize'}>
                <svg viewBox="0 0 10 10" shapeRendering="crispEdges" aria-hidden="true">
                  {max ? (
                    <path d="M3 0h7v7H8V2H3zM0 3h7v7H0zm1 2v4h5V5z" fill="#fff" fillRule="evenodd" />
                  ) : (
                    <path d="M0 0h10v10H0zm1 3v6h8V3z" fill="#fff" fillRule="evenodd" />
                  )}
                </svg>
              </button>
            )}
            <button type="button" className="tbtn tbtn--close" onClick={doClose} aria-label={`Close ${win.title}`} title="Close">
              <svg viewBox="0 0 10 10" shapeRendering="crispEdges" aria-hidden="true">
                <path d="M0 0h2v1h1v1h1v1h2V2h1V1h1V0h2v2H9v1H8v1H7v2h1v1h1v1h1v2H8V9H7V8H6V7H4v1H3v1H2v1H0V8h1V7h1V6h1V4H2V3H1V2H0z" fill="#fff" />
              </svg>
            </button>
          </div>
        </div>
        {menus ? (
          <MenuBar menus={menus} label={`${win.title} menu`} />
        ) : menubar && (
          <div className="win__menubar" aria-hidden="true">
            {menubar.map((m) => (
              <span key={m}>
                <u>{m[0]}</u>
                {m.slice(1)}
              </span>
            ))}
          </div>
        )}
        <div className="win__body">{children}</div>
        {statusbar}
      </div>
    </Rnd>
  );
}
