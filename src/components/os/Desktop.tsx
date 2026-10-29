import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { curation, WALLPAPERS } from '../../data/assets';
import { concept } from '../../data/copy';
import { collectionCount } from '../../lib/catalogue/hydrate';
import { formatCount } from '../../lib/catalogue/format';
import { useCatalogue } from '../../lib/catalogue/load';
import { play } from '../../lib/sound';
import { productPath, touchGrassPath, useBrowse } from '../../lib/useBrowse';
import { useCart, itemCount } from '../../state/cart';
import { useFavorites } from '../../state/favorites';
import { useOS, type AppId } from '../../state/os';
import { useIconPositions, type IconOffset } from '../../state/icons';
import { usePreferences } from '../../state/preferences';
import { Icon, type IconName } from './Icon';

export function Wallpaper() {
  const wp = usePreferences((s) => s.wallpaper);
  const mode = usePreferences((s) => s.wallpaperMode);
  let src: string | null = null;
  let cls = `wallpaper wallpaper--${mode}`;
  if (wp.kind === 'preset') {
    const preset = WALLPAPERS.find((w) => w.id === wp.id) ?? WALLPAPERS[0]!;
    src = preset.src;
    cls = `wallpaper wallpaper--${preset.mode}`;
    if (preset.id === 'fw27') cls += ' wallpaper--preset-fw27';
  } else src = wp.src;
  const style: CSSProperties = src ? ({ backgroundImage: cls.includes('preset-fw27') ? undefined : `url("${src}")`, ['--wp-photo' as string]: `url("${src}")` } as CSSProperties) : {};
  return (
    <div className={cls} style={style} aria-hidden="true">
      <div className="wallpaper__grain" />
    </div>
  );
}

/** px a pointer must travel before a press becomes a drag (below it, it's a click). */
const DRAG_THRESHOLD = 5;
/** px per Shift+Arrow nudge. */
const NUDGE = 8;

interface DIcon {
  id: string;
  label: string;
  icon: IconName;
  aria: string;
  tip?: string;
  badge?: number;
  act: () => void;
}

export function DesktopIcons() {
  const cat = useCatalogue();
  const browse = useBrowse();
  const bag = useCart((s) => itemCount(s.items));
  const favs = useFavorites((s) => s.handles.length);
  const [selected, setSelected] = useState<string | null>(null);
  const open = (id: AppId) => useOS.getState().open(id);
  const total = cat?.products.length;
  const pjoys = collectionCount(cat, 'pjoys');
  const touchGrass = cat?.byHandle.get(curation.jokes.touchGrass);
  const gameNight = cat?.byHandle.get(curation.jokes.gameNight);

  const left: DIcon[] = [
    { id: 'internet', label: 'IYS INTERNET', icon: 'internet', aria: 'Open IYS Internet', act: () => browse('/') },
    { id: 'shop', label: 'SHOP ALL', icon: 'hanger', aria: `Shop all ${total ? formatCount(total) : ''} products`, tip: total ? `${formatCount(total)} items` : undefined, act: () => browse('/shop') },
    { id: 'pjoys', label: 'PJOYS', icon: 'pjoys', aria: `Open Pjoys collection${pjoys ? `, ${pjoys} items` : ''}`, tip: pjoys ? `${pjoys} items` : undefined, act: () => browse('/collections/pjoys') },
    { id: 'wardrobe', label: 'MY WARDROBE', icon: 'wardrobe', aria: 'Open My Wardrobe, browse by folder', act: () => open('wardrobe') },
    { id: 'messenger', label: 'IYS MESSENGER', icon: 'messenger', aria: 'Open IYS Messenger', act: () => open('messenger') },
    { id: 'camera', label: 'IYS CAMERA', icon: 'camera', aria: 'Open IYS Camera photos', act: () => open('camera') },
    { id: 'favorites', label: 'FAVORITES', icon: 'favorites', aria: `Open Favorites, ${favs} saved`, badge: favs || undefined, act: () => browse('/favorites') },
    { id: 'stores', label: 'STORES', icon: 'stores', aria: 'Find IYS stores', act: () => browse('/stores') },
    { id: 'bag', label: 'MY BAG', icon: 'bag', aria: `Open My Bag, ${bag} items`, badge: bag || undefined, act: () => open('bag') },
    { id: 'control', label: 'CONTROL PANEL', icon: 'control', aria: 'Open Control Panel', act: () => open('control') },
    { id: 'kids', label: 'IYS KIDS', icon: 'kids', aria: 'Open IYS Kids collection', act: () => browse('/collections/all-kids-products') },
  ];
  const right: DIcon[] = [
    { id: 'readme', label: 'README.TXT', icon: 'txt', aria: 'Open README.TXT', act: () => open('readme') },
    { id: 'mail', label: 'IYS MAIL', icon: 'mail', aria: 'Open IYS Mail', act: () => open('mail') },
    { id: 'games', label: 'IYS GAMES', icon: 'games', aria: 'Open IYS Games, 6 games', act: () => open('games') },
    { id: 'recycle', label: 'RECYCLE BIN', icon: 'recycle', aria: 'Open Recycle Bin', act: () => open('recycle') },
  ];
  // Opens the curated Touch Grass product; if it ever leaves the snapshot, searches instead.
  right.push({
    id: 'touch-grass',
    label: 'TOUCH_GRASS.EXE',
    icon: 'exe',
    aria: touchGrass ? `Run TOUCH_GRASS.EXE (opens ${touchGrass.title})` : 'Run TOUCH_GRASS.EXE (searches IYS for touch grass)',
    act: () => {
      browse(touchGrassPath(touchGrass?.handle));
      useOS.getState().notify(concept.touchGrass.loaded);
    },
  });
  if (gameNight) right.push({ id: 'game-night', label: concept.gameNight, icon: 'exe', aria: `Run GAME_NIGHT.EXE (opens ${gameNight.title})`, act: () => browse(productPath(gameNight.handle)) });
  right.push(
    { id: 'newsletter', label: 'IYS NEWSLETTER', icon: 'newsletter', aria: 'Open IYS Newsletter', act: () => open('newsletter') },
    { id: 'exchange', label: concept.exchange.icon, icon: 'exchange', aria: 'Open XCHANGE.EXE, the exchanges and refunds form', act: () => open('exchange') },
  );

  // ── Movable icons: offsets from each icon's default grid slot. ──
  const offsets = useIconPositions((s) => s.offsets);
  const desk = useOS((s) => s.desk);
  const slots = useRef(new Map<string, HTMLLIElement>());
  const drag = useRef<{ id: string; x0: number; y0: number; base: IconOffset; moved: boolean } | null>(null);
  const suppressClick = useRef<string | null>(null);
  const [live, setLive] = useState<{ id: string } & IconOffset | null>(null);
  const [, remeasure] = useState(0);
  // Re-clamp after mount and whenever the desktop is resized.
  useLayoutEffect(() => remeasure((n) => n + 1), [desk.w, desk.h]);

  /** Keep an icon fully inside the desktop (the taskbar sits outside it). */
  const clamp = (id: string, o: IconOffset): IconOffset => {
    const li = slots.current.get(id);
    const area = li?.closest('.desktop');
    const btn = li?.firstElementChild as HTMLElement | null;
    if (!li || !area || !btn) return o;
    const a = area.getBoundingClientRect();
    const r = li.getBoundingClientRect();
    const left = r.left - a.left;
    const top = r.top - a.top;
    return {
      dx: Math.min(Math.max(o.dx, -left), a.width - btn.offsetWidth - left),
      dy: Math.min(Math.max(o.dy, -top), a.height - btn.offsetHeight - top),
    };
  };
  const offsetOf = (id: string): IconOffset | null => (live?.id === id ? live : offsets[id] ? clamp(id, offsets[id]!) : null);

  const render = (list: DIcon[]) =>
    list.map((d) => {
      const o = offsetOf(d.id);
      return (
      <li
        key={d.id}
        ref={(el) => {
          if (el) slots.current.set(d.id, el);
          else slots.current.delete(d.id);
        }}
      >
        <button
          type="button"
          className={`dicon${live?.id === d.id ? ' is-dragging' : ''}`}
          data-icon={d.id}
          aria-label={d.aria}
          title={d.tip ? `Open - ${d.tip}` : 'Open'}
          aria-current={selected === d.id ? 'true' : undefined}
          style={o ? { transform: `translate(${o.dx}px, ${o.dy}px)` } : undefined}
          onClick={() => {
            if (suppressClick.current === d.id) {
              suppressClick.current = null;
              return;
            }
            setSelected(d.id);
            play('click');
            d.act();
          }}
          onFocus={() => setSelected(d.id)}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            suppressClick.current = null;
            drag.current = { id: d.id, x0: e.clientX, y0: e.clientY, base: offsets[d.id] ? clamp(d.id, offsets[d.id]!) : { dx: 0, dy: 0 }, moved: false };
            e.currentTarget.setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            const g = drag.current;
            if (!g || g.id !== d.id) return;
            const dx = e.clientX - g.x0;
            const dy = e.clientY - g.y0;
            if (!g.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
            g.moved = true;
            setSelected(d.id);
            setLive({ id: d.id, ...clamp(d.id, { dx: g.base.dx + dx, dy: g.base.dy + dy }) });
          }}
          onPointerUp={(e) => {
            const g = drag.current;
            drag.current = null;
            if (!g || g.id !== d.id || !g.moved) return;
            const end = clamp(d.id, { dx: g.base.dx + e.clientX - g.x0, dy: g.base.dy + e.clientY - g.y0 });
            useIconPositions.getState().move(d.id, end);
            setLive(null);
            // The click that follows this pointerup must not open the app.
            suppressClick.current = d.id;
            window.setTimeout(() => {
              if (suppressClick.current === d.id) suppressClick.current = null;
            }, 0);
          }}
          onPointerCancel={() => {
            drag.current = null;
            setLive(null);
          }}
          onKeyDown={(e) => {
            // Shift + arrow keys nudge a focused icon (keyboard "move mode").
            const step = { ArrowLeft: [-NUDGE, 0], ArrowRight: [NUDGE, 0], ArrowUp: [0, -NUDGE], ArrowDown: [0, NUDGE] }[e.key];
            if (!e.shiftKey || !step) return;
            e.preventDefault();
            const cur = offsets[d.id] ? clamp(d.id, offsets[d.id]!) : { dx: 0, dy: 0 };
            useIconPositions.getState().move(d.id, clamp(d.id, { dx: cur.dx + step[0]!, dy: cur.dy + step[1]! }));
          }}
        >
          <span className="dicon__img">
            <Icon name={d.icon} size={40} />
          </span>
          {d.badge ? <span className="dicon__badge" aria-hidden="true">{d.badge}</span> : null}
          <span className="dicon__label">{d.label.split(/(?<=[_./])/).map((part, i) => (i ? [<wbr key={i} />, part] : part))}</span>
        </button>
      </li>
      );
    });

  return (
    <>
      <ul className="desktop__icons" aria-label="Desktop">
        {render(left)}
      </ul>
      <ul className="desktop__icons desktop__icons--right" aria-label="Desktop files">
        {render(right)}
      </ul>
    </>
  );
}
