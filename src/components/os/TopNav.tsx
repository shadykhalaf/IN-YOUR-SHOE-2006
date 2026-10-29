import { brand } from '../../data/assets';
import { play } from '../../lib/sound';
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
      <img src={brand.markWhite} alt="" width={22} height={11} />
      <span>MENU</span>
      <span className="topnav__caret" aria-hidden="true">
        ▾
      </span>
    </button>
  );
}

/**
 * Top strip, right: MY BAG with the real item count. Opens (or brings to the
 * front) the one MY BAG window; there is no second bag and no second checkout.
 */
export function TopBagButton() {
  const count = useCart((s) => itemCount(s.items));
  return (
    <button
      type="button"
      className="topnav topnav--bag"
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
