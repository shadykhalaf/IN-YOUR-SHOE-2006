import { useCallback, useState } from 'react';
import { openViewer, setWallpaperImage, type ViewerImage } from '../../lib/actions';
import { sized } from '../../lib/catalogue/images';
import { decorativeFilename } from '../../lib/catalogue/format';
import { useFavorites } from '../../state/favorites';
import { ContextMenu, type MenuItem } from '../os/Overlays';

export interface MenuTarget {
  handle?: string;
  title: string;
  images: { src: string; alt?: string | null; width?: number | null; height?: number | null }[];
  index?: number;
  sourceUrl?: string;
  onOpen?: () => void;
}

export function toViewerImages(t: MenuTarget): ViewerImage[] {
  return t.images.map((im, i) => ({
    src: im.src.startsWith('/') ? im.src : sized(im.src, 900),
    full: im.src.startsWith('/') ? im.src : sized(im.src, 1400),
    title: t.title,
    filename: decorativeFilename(`${t.title}${t.images.length > 1 ? ` ${i + 1}` : ''}`),
    alt: im.alt || t.title,
    sourceUrl: t.sourceUrl,
    productHandle: t.handle,
    width: im.width,
    height: im.height,
  }));
}

/**
 * Period image-action menu. Right-click, Shift+F10 or the context-menu key
 * open it; the page's own right-click is left alone everywhere else.
 */
export function useImageMenu(target: MenuTarget | null) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const fav = useFavorites((s) => (target?.handle ? s.handles.includes(target.handle) : false));
  const toggle = useFavorites((s) => s.toggle);

  const openAt = useCallback((x: number, y: number) => setPos({ x, y }), []);
  const onContextMenu = (e: React.MouseEvent) => {
    if (!target) return;
    e.preventDefault();
    openAt(e.clientX, e.clientY);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!target) return;
    if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu') {
      e.preventDefault();
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      openAt(r.left + 12, r.top + 12);
    }
  };

  let menu = null;
  if (pos && target) {
    const idx = target.index ?? 0;
    const current = target.images[idx];
    const items: MenuItem[] = [
      ...(target.onOpen ? [{ label: 'Open', isDefault: true, onSelect: target.onOpen }] : []),
      { label: 'View Full Size', onSelect: () => openViewer(toViewerImages(target), idx) },
      ...(target.handle ? [{ label: fav ? 'Remove from Favorites' : 'Add to Favorites', onSelect: () => toggle(target.handle!) }] : []),
      ...(current ? [{ label: 'Set as Wallpaper', onSelect: () => setWallpaperImage({ src: current.src.startsWith('/') ? current.src : sized(current.src, 1400), title: target.title, sourceUrl: target.sourceUrl }) }] : []),
      { label: '', separator: true },
      ...(target.sourceUrl ? [{ label: 'View Original Product ↗', href: target.sourceUrl }] : []),
    ];
    menu = <ContextMenu x={pos.x} y={pos.y} items={items} onClose={() => setPos(null)} label={`Image actions for ${target.title}`} />;
  }
  return { onContextMenu, onKeyDown, openAt, menu };
}
