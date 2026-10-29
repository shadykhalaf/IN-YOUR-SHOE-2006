import { useEffect, useRef, useState } from 'react';

export interface MenuItemDef {
  label: string;
  run: () => void;
  disabled?: boolean;
  /** Draw a separator line above this item. */
  separator?: boolean;
}
export interface MenuDef {
  label: string;
  items: MenuItemDef[];
}

/**
 * Classic window menu bar (File · Edit · View …) with real dropdowns.
 * One menu open at a time; click outside, Escape or Tab closes; ←/→ move
 * between menus, ↑/↓ move through items, Enter/Space activates.
 */
export function MenuBar({ menus, label }: { menus: MenuDef[]; label: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const tops = useRef<(HTMLButtonElement | null)[]>([]);

  const items = (i: number) => [...(root.current?.querySelectorAll<HTMLButtonElement>(`[data-menu="${i}"] .menubar__drop [role="menuitem"]:not(:disabled)`) ?? [])];
  const focusItem = (i: number, which: 'first' | 'last') => requestAnimationFrame(() => {
    const list = items(i);
    (which === 'first' ? list[0] : list[list.length - 1])?.focus();
  });

  useEffect(() => {
    if (open === null) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(null);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  const close = (refocus: number | null) => {
    setOpen(null);
    if (refocus !== null) tops.current[refocus]?.focus();
  };
  const move = (from: number, d: number, openIt: boolean) => {
    const n = (from + d + menus.length) % menus.length;
    tops.current[n]?.focus();
    if (openIt) {
      setOpen(n);
      focusItem(n, 'first');
    }
  };

  const onTopKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      move(i, e.key === 'ArrowRight' ? 1 : -1, open !== null);
    } else if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(i);
      focusItem(i, 'first');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(i);
      focusItem(i, 'last');
    } else if (e.key === 'Escape' && open !== null) {
      e.preventDefault();
      e.stopPropagation();
      close(i);
    }
  };

  const onMenuKey = (e: React.KeyboardEvent, i: number) => {
    const list = items(i);
    const at = list.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const d = e.key === 'ArrowDown' ? 1 : -1;
      list[(at + d + list.length) % list.length]?.focus();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      move(i, e.key === 'ArrowRight' ? 1 : -1, true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close(i);
    } else if (e.key === 'Tab') {
      setOpen(null);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      (e.key === 'Home' ? list[0] : list[list.length - 1])?.focus();
    }
  };

  return (
    <div className="win__menubar menubar" role="menubar" aria-label={label} ref={root}>
      {menus.map((m, i) => (
        <div key={m.label} className="menubar__item" data-menu={i}>
          <button
            type="button"
            role="menuitem"
            ref={(el) => {
              tops.current[i] = el;
            }}
            className="menubar__top"
            aria-haspopup="menu"
            aria-expanded={open === i}
            tabIndex={i === 0 ? 0 : -1}
            onClick={() => setOpen(open === i ? null : i)}
            onMouseEnter={() => open !== null && open !== i && setOpen(i)}
            onKeyDown={(e) => onTopKey(e, i)}
          >
            <u>{m.label[0]}</u>
            {m.label.slice(1)}
          </button>
          {open === i && (
            <ul className="ctxmenu menubar__drop" role="menu" aria-label={m.label} onKeyDown={(e) => onMenuKey(e, i)}>
              {m.items.map((it) => (
                <li key={it.label} role="none">
                  {it.separator && <hr />}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={it.disabled}
                    onClick={() => {
                      close(null);
                      it.run();
                    }}
                  >
                    {it.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
