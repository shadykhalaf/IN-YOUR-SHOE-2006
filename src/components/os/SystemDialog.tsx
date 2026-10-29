import { useEffect, useId, useRef, type ReactNode } from 'react';
import { play } from '../../lib/sound';
import { Icon, type IconName } from './Icon';

/**
 * Modal system dialog (real `role="alertdialog"`): focus moves in, Tab is
 * trapped, Escape cancels, focus returns to the trigger on close.
 */
export function SystemDialog({
  title,
  icon = 'info',
  children,
  actions,
  onCancel,
  sound = 'ping',
  width,
}: {
  title: string;
  icon?: IconName;
  children: ReactNode;
  actions: ReactNode;
  onCancel: () => void;
  sound?: 'ping' | 'error' | null;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    if (sound) play(sound);
    const el = ref.current;
    requestAnimationFrame(() => (el?.querySelector<HTMLElement>('[data-autofocus]') ?? el?.querySelector<HTMLElement>('button'))?.focus());
    return () => {
      if (back && back.isConnected) requestAnimationFrame(() => back.focus({ preventScroll: true }));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    }
    if (e.key === 'Tab') {
      const f = [...(ref.current?.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea') ?? [])].filter((x) => !x.hasAttribute('disabled'));
      if (!f.length) return;
      const first = f[0]!;
      const last = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && ref.current?.querySelector<HTMLElement>('button')?.focus()}>
      <div ref={ref} className="dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId} onKeyDown={onKeyDown} style={width ? { width: `min(${width}px, calc(100vw - 24px))` } : undefined}>
        <div className="titlebar">
          <Icon name="exe" size={16} className="titlebar__icon" />
          <h2 className="titlebar__title" id={titleId}>
            {title}
          </h2>
          <div className="titlebar__buttons">
            <button type="button" className="tbtn tbtn--close" onClick={onCancel} aria-label="Close dialog">
              <svg viewBox="0 0 10 10" shapeRendering="crispEdges" aria-hidden="true">
                <path d="M0 0h2v1h1v1h1v1h2V2h1V1h1V0h2v2H9v1H8v1H7v2h1v1h1v1h1v2H8V9H7V8H6V7H4v1H3v1H2v1H0V8h1V7h1V6h1V4H2V3H1V2H0z" fill="#fff" />
              </svg>
            </button>
          </div>
        </div>
        <div className="dialog__body">
          <Icon name={icon} size={32} />
          <div className="dialog__msg" id={descId}>
            {children}
          </div>
        </div>
        <div className="dialog__actions">{actions}</div>
      </div>
    </div>
  );
}
