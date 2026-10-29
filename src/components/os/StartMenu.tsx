import { useEffect, useRef } from 'react';
import { brand } from '../../data/assets';
import { concept } from '../../data/copy';
import { MENU } from '../../data/taxonomy';
import { collectionCount } from '../../lib/catalogue/hydrate';
import { formatCount } from '../../lib/catalogue/format';
import { useCatalogue } from '../../lib/catalogue/load';
import { switchToRealIYS } from '../../lib/checkout';
import { collectionPath, useBrowse } from '../../lib/useBrowse';
import { useOS, type AppId } from '../../state/os';
import { Icon, type IconName } from './Icon';

export function StartMenu() {
  const open = useOS((s) => s.startOpen);
  const anchor = useOS((s) => s.startAnchor);
  const setStart = useOS((s) => s.setStart);
  const cat = useCatalogue();
  const browse = useBrowse();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    ref.current?.querySelector<HTMLElement>('a, button')?.focus();
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      // Either door (taskbar "menu" or the top strip's MENU) toggles it itself.
      if (!ref.current?.contains(t) && !t.closest('.start, .topnav--menu')) setStart(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open, setStart]);

  if (!open) return null;

  const go = (to: string) => {
    setStart(false);
    browse(to);
  };
  const app = (id: AppId) => {
    setStart(false);
    useOS.getState().open(id);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const items = [...(ref.current?.querySelectorAll<HTMLElement>('[data-mi]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      setStart(false);
      document.querySelector<HTMLElement>(anchor === 'top' ? '.topnav--menu' : '.start')?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(i + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length]?.focus();
    }
  };

  const shopItems = MENU.filter((m) => m.collection === null || (collectionCount(cat, m.collection) ?? 0) > 0);
  // Shopping first (SEARCH, MY BAG, FAVORITES, STORES, MY WARDROBE), then the rest of IYS OS.
  const system: { label: string; icon: IconName; sub: string; act: () => void }[] = [
    { label: 'SEARCH', icon: 'search', sub: 'Find anything', act: () => go('/search') },
    { label: 'MY BAG', icon: 'bag', sub: 'Your cool decisions', act: () => app('bag') },
    { label: 'FAVORITES', icon: 'favorites', sub: 'Saved items', act: () => go('/favorites') },
    { label: 'STORES', icon: 'stores', sub: 'Find IYS IRL', act: () => go('/stores') },
    { label: 'MY WARDROBE', icon: 'wardrobe', sub: 'Browse by folder', act: () => app('wardrobe') },
    { label: 'IYS MESSENGER', icon: 'messenger', sub: 'Who’s online', act: () => app('messenger') },
    { label: 'IYS CAMERA', icon: 'camera', sub: 'DCIM photos', act: () => app('camera') },
    { label: 'IYS GAMES', icon: 'games', sub: '6 games starring Catchy', act: () => app('games') },
    { label: 'IYS MAIL', icon: 'mail', sub: 'Support · orders@', act: () => app('mail') },
    { label: 'IYS NEWSLETTER', icon: 'newsletter', sub: 'Cool list · 10% off', act: () => app('newsletter') },
    { label: 'XCHANGE.EXE :)', icon: 'exchange', sub: 'Exchanges / refunds', act: () => app('exchange') },
    { label: 'IYS ESSENTIALS', icon: 'txt', sub: 'Refunds, shipping, terms', act: () => app('essentials') },
    { label: 'CONTROL PANEL', icon: 'control', sub: 'Sound, CRT, wallpaper', act: () => app('control') },
    // The always-there way out: the real store, with this bag (same handoff as the REAL IYS switch).
    {
      label: concept.escape.menuItem,
      icon: 'internet',
      sub: concept.escape.menuSub,
      act: () => {
        useOS.getState().setStart(false);
        switchToRealIYS();
      },
    },
  ];

  return (
    <div ref={ref} className={`startmenu${anchor === 'top' ? ' startmenu--top' : ''}`} id="iys-menu" role="menu" aria-label="IYS menu" onKeyDown={onKeyDown}>
      <div className="startmenu__head">
        <img src={brand.markWhite} alt="" />
        <div>
          <strong>{concept.os}</strong>
          <small>Time machine target: {concept.targetYear}</small>
        </div>
      </div>
      <div className="startmenu__cols">
        <ul className="startmenu__col" role="none">
          {shopItems.map((m) => {
            const count = m.collection ? collectionCount(cat, m.collection) : cat?.products.length ?? null;
            const to = m.to ?? collectionPath(m.collection);
            return (
              <li key={m.label} role="none">
                <button type="button" role="menuitem" data-mi onClick={() => go(to)}>
                  <Icon name={m.collection === 'pjoys' || m.collection === 'fluffy-pjoys' ? 'pjoys' : m.collection ? 'folder' : 'hanger'} size={24} />
                  <span>
                    <b>{m.label}</b>
                    {count !== null && <small>{formatCount(count)} items</small>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <ul className="startmenu__col" role="none">
          {system.map((s) => (
            <li key={s.label} role="none">
              <button type="button" role="menuitem" data-mi onClick={s.act}>
                <Icon name={s.icon} size={24} />
                <span>
                  <b>{s.label}</b>
                  <small>{s.sub}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="startmenu__foot">
        <span>IN YOUR SHOE · 2006</span>
        <button type="button" className="btn btn--small" data-mi role="menuitem" onClick={() => { setStart(false); useOS.getState().showDialog({ kind: 'confirm-reset' }); }}>
          <Icon name="shutdown" size={16} /> Reset
        </button>
      </div>
    </div>
  );
}
