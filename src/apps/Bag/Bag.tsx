import { Icon } from '../../components/os/Icon';
import { concept } from '../../data/copy';
import { Window } from '../../components/os/Window';
import { formatEGP } from '../../lib/catalogue/format';
import { startCheckout } from '../../lib/checkout';
import { productPath, useBrowse } from '../../lib/useBrowse';
import { itemCount, subtotal, useCart } from '../../state/cart';
import { BagList } from '../../components/shop/BagList';
import { EssentialLinks } from '../../components/shop/EssentialLinks';
import { BagIdeas, BagOffers, HandoffStatus, PromoCode, ShippingProgress, useHandoffPending } from '../../components/shop/BagExtras';
import type { Win } from '../../state/os';

export default function Bag({ win }: { win: Win }) {
  const items = useCart((s) => s.items);
  const browse = useBrowse();
  const total = subtotal(items);
  const count = itemCount(items);
  const leaving = useHandoffPending();
  return (
    <Window
      win={win}
      icon="bag"
      menubar={['File', 'Edit', 'View', 'Help']}
      statusbar={
        <div className="statusbar">
          <span className="grow">
            {count} item(s) · {formatEGP(total)}
          </span>
          <span>Saved on this computer</span>
        </div>
      }
    >
      <div className="win__scroll bag">
        <p className="bag__path">
          <Icon name="folder-open" size={16} /> C:\MY BAG\
        </p>
        <BagList onOpenProduct={(h) => browse(productPath(h))} />
        {items.length > 0 && <BagIdeas onOpenProduct={(h) => browse(productPath(h))} variant="desktop" />}
        {items.length === 0 && (
          <p className="cp-actions bag__empty-actions">
            <button type="button" className="btn btn--go" onClick={() => browse('/collections/newest')}>
              {concept.y2k.primary} ›
            </button>
            <button type="button" className="btn btn--sky" onClick={() => browse('/collections/pjoys')}>
              {concept.y2k.secondary}
            </button>
          </p>
        )}
      </div>
      {items.length > 0 && (
        <div className="bag__foot">
          <ShippingProgress />
          <BagOffers />
          <div className="bag__total">
            <span>Subtotal ({count} items)</span>
            <b>{formatEGP(total)}</b>
          </div>
          <p className="bag__note">Snapshot prices in EGP. Delivery and offers are calculated on the real site.</p>
          <EssentialLinks className="bag__note" ids={['exchange-refund', 'shipping', 'terms-conditions']} />
          <PromoCode />
          <button type="button" className="btn btn--go bag__checkout" onClick={() => startCheckout()} disabled={leaving} aria-busy={leaving}>
            {concept.y2k.bagCta}
          </button>
          <HandoffStatus />
          <p className="bag__note">
            <button type="button" className="link" onClick={() => browse('/shop')}>
              {concept.y2k.keepShopping}
            </button>
          </p>
        </div>
      )}
    </Window>
  );
}
