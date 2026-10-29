import { useLocation } from 'react-router';
import { brand } from '../../data/assets';
import { play } from '../../lib/sound';
import { useBrowse } from '../../lib/useBrowse';
import { itemCount, useCart } from '../../state/cart';
import { useOS } from '../../state/os';
import { Icon } from './Icon';

/**
 * Top strip, left: THE IYS menu (the taskbar corner is DESKTOP now; with the
 * top nav switched off, the taskbar corner goes back to being the menu).
 */
export function TopMenuButton() {
  const open = useOS((s) => s.startOpen && s.startAnchor === 'top');
  return (
    <button
      type="button"
      className="topnav topnav--menu"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls="iys-menu"
      onClick={() => {
        play('click');
        useOS.getState().setStart(!open, 'top');
      }}
    >
      {/* the white mark is square: 11×11 reserved = 11×11 drawn, so MENU (and IYS beside it) never jump when it loads */}
      <img src={brand.markWhite} alt="" width={11} height={11} />
      <span>MENU</span>
      <span className="topnav__caret" aria-hidden="true">
        ▾
      </span>
    </button>
  );
}

/**
 * Top strip, beside MENU: IYS = home. Always the same place: the site's
 * landing, IYS INTERNET on its home page (the one browser window, restored and
 * in front, reopened if it was closed; already home → back to the top).
 * Other windows, the bag, favorites, icons and wallpaper stay as they are.
 */
export function TopHomeButton() {
  const browse = useBrowse();
  const { pathname, search } = useLocation();
  return (
    <button
      type="button"
      className="topnav topnav--ice topnav--home"
      aria-label="Go to IYS Retro home"
      title="IYS home"
      onClick={() => {
        play('click');
        browse('/');
        if (pathname === '/' && !search) document.getElementById('iys-main')?.scrollTo({ top: 0 });
      }}
    >
      <Icon name="home" size={14} />
      <img className="topnav__iys" src={brand.mark} alt="" width={34} height={12} />
    </button>
  );
}

/**
 * Top strip, right: MY BAG with the real item count, in the IYS MOBILE
 * shortcut keys' glossy ice face. Opens (or brings to the front) the one MY
 * BAG window; there is no second bag and no second checkout.
 */
export function TopBagButton() {
  const count = useCart((s) => itemCount(s.items));
  return (
    <button
      type="button"
      className="topnav topnav--ice topnav--bag"
      aria-label={count ? `My Bag, ${count} ${count === 1 ? 'item' : 'items'}` : 'My Bag, empty'}
      onClick={() => {
        play('click');
        useOS.getState().open('bag');
      }}
    >
      <Icon name="bag" size={16} />
      <span>MY BAG</span>
      {count > 0 && (
        <span className="topnav__badge" aria-hidden="true">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
