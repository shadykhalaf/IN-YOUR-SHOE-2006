import { useCart } from '../../state/cart';
import { useOS } from '../../state/os';
import { usePreferences } from '../../state/preferences';
import { notifyCatchy } from './events';
import { bagKind } from './lines';

/**
 * Read-only bridges from the existing stores to Catchy events. They only
 * *observe* state changes after the real action has already happened, so the
 * bag, windows, games and wallpaper never wait for (or depend on) Catchy.
 * Returns one cleanup that removes every subscription.
 */
export function startCatchyAdapters(): () => void {
  const offs: (() => void)[] = [];

  // MY BAG: a line's quantity went up (ADD TO BAG, + MY BAG, Qty +).
  offs.push(
    useCart.subscribe((s, prev) => {
      for (const it of s.items) {
        const before = prev.items.find((p) => p.key === it.key)?.quantity ?? 0;
        if (it.quantity > before) {
          notifyCatchy({ type: 'bag:add', kind: bagKind(it.handle, it.title) });
          return;
        }
      }
    }),
  );

  // Windows: MY BAG opened, IYS GAMES / a game opened.
  offs.push(
    useOS.subscribe((s, prev) => {
      const fresh = s.windows.filter((w) => !prev.windows.some((p) => p.id === w.id));
      for (const w of fresh) {
        if (w.app === 'bag') notifyCatchy({ type: 'bag:open' });
        else if (w.app === 'games') notifyCatchy({ type: 'games:open' });
        else if (w.app === 'game') notifyCatchy({ type: 'game:start' });
      }
    }),
  );

  // Wallpaper changed.
  offs.push(
    usePreferences.subscribe((s, prev) => {
      if (s.wallpaper !== prev.wallpaper || s.wallpaperMode !== prev.wallpaperMode) notifyCatchy({ type: 'wallpaper:change' });
    }),
  );

  return () => offs.forEach((off) => off());
}
