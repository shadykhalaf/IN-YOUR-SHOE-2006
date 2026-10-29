import { concept } from '../../data/copy';
import { formatEGP } from '../../lib/catalogue/format';
import { sized } from '../../lib/catalogue/images';
import { MAX_QTY, useCart } from '../../state/cart';
import { Icon } from '../os/Icon';

export function BagList({ onOpenProduct }: { onOpenProduct: (handle: string) => void }) {
  const items = useCart((s) => s.items);
  const { inc, dec, remove } = useCart.getState();
  if (!items.length)
    return (
      <div className="bag__empty">
        <Icon name="bag" size={48} />
        <p>
          <b>{concept.y2k.bagEmpty}</b>
        </p>
        <p>items u add get copied here xo</p>
      </div>
    );
  return (
    <ul className="bag__list" aria-label="Items in bag">
      {items.map((it) => (
        <li key={it.key} className="bag__row">
          {it.image ? <img src={it.image.startsWith('/') ? it.image : sized(it.image, 160)} alt="" width={56} height={70} loading="lazy" /> : <Icon name="product" size={48} />}
          <div className="bag__info">
            <button type="button" className="link bag__name" onClick={() => onOpenProduct(it.handle)}>
              {it.title}
            </button>
            {(it.variantTitle || it.size) && <span className="bag__variant">{it.variantTitle ?? `Size ${it.size}`}</span>}
            <span className="bag__unit">{formatEGP(it.price)} each</span>
            <div className="bag__qty" role="group" aria-label={`Quantity of ${it.title}`} data-repeatable>
              <button type="button" className="btn btn--small" onClick={() => dec(it.key)} aria-label={`Decrease quantity of ${it.title}`}>
                −
              </button>
              <output aria-live="polite" aria-label={`Quantity ${it.quantity}`}>
                {it.quantity}
              </output>
              <button type="button" className="btn btn--small" onClick={() => inc(it.key)} disabled={it.quantity >= MAX_QTY} aria-label={`Increase quantity of ${it.title}`}>
                +
              </button>
              <button type="button" className="link bag__remove" onClick={() => remove(it.key)} aria-label={`Remove ${it.title} from bag`}>
                Remove
              </button>
            </div>
          </div>
          <b className="bag__line">{formatEGP(it.price * it.quantity)}</b>
        </li>
      ))}
    </ul>
  );
}
