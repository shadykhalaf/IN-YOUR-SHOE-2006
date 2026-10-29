import { memo, useState } from 'react';
import { concept } from '../../data/copy';
import { Link } from 'react-router';
import type { Product } from '../../lib/catalogue/types';
import { productPath } from '../../lib/useBrowse';
import { addToBag, quickRequest } from '../../state/status';
import { FavoriteButton } from './FavoriteButton';
import { useImageMenu } from './ImageMenu';
import { Price, SaleBadge } from './Price';
import { RemoteImage } from './RemoteImage';
import { useNavigate } from 'react-router';

/**
 * 2000s ecommerce card: hard edges, underlined link, classic select — with
 * modern behaviour underneath (real links, real buttons, lazy images).
 */
export const ProductCard = memo(function ProductCard({ p, eager }: { p: Product; eager?: boolean }) {
  const navigate = useNavigate();
  const [hover, setHover] = useState(false);
  const sizeOnly = p.sizes.length > 0 && p.sizes.every((s) => s.variantId !== null);
  const [size, setSize] = useState('');
  const menu = useImageMenu({
    handle: p.handle,
    title: p.title,
    images: [p.image, p.image2].filter((x): x is string => Boolean(x)).map((src) => ({ src, alt: p.title })),
    sourceUrl: p.sourceUrl,
    onOpen: () => navigate(productPath(p.handle)),
  });

  const quickAdd = () => {
    const row = sizeOnly ? p.sizes.find((s) => s.label === size) : null;
    const req = quickRequest(p, row ?? null);
    if (req) addToBag(req);
  };

  const available = p.sizes.filter((s) => s.available);
  return (
    <article className="pcard" aria-labelledby={`pc-${p.handle}`}>
      <Link
        to={productPath(p.handle)}
        className="pcard__img"
        tabIndex={-1}
        aria-hidden="true"
        onMouseEnter={() => setHover(true)}
        onContextMenu={menu.onContextMenu}
      >
        <RemoteImage src={p.image} alt="" title={p.title} width={p.imageWidth} height={p.imageHeight} sourceUrl={p.sourceUrl} eager={eager} base={360} sizes="(max-width: 1100px) 33vw, 220px" />
        {hover && p.image2 && <RemoteImage className="pcard__alt" src={p.image2} alt="" title={p.title} base={360} sizes="220px" />}
        {p.onSale && <SaleBadge />}
      </Link>
      <h3 className="pcard__title" id={`pc-${p.handle}`}>
        <Link to={productPath(p.handle)} onKeyDown={menu.onKeyDown}>
          {p.title}
        </Link>
      </h3>
      <Price price={p.price} compareAt={p.compareAtPrice} from={p.priceMax !== null && p.price !== null && p.priceMax > p.price} />
      {p.available === false && <span className="stock stock--out">OUT OF STOCK</span>}
      {p.sizes.length > 0 && (
        <p className="pcard__sizes">
          <span className="sr-only">Sizes: {p.sizes.map((s) => `${s.label}${s.available ? '' : ' (sold out)'}`).join(', ')}</span>
          {p.sizes.map((s) => (
            <span key={s.label} className={s.available ? undefined : 'is-out'} aria-hidden="true">
              {s.label}
            </span>
          ))}
        </p>
      )}
      <div className="pcard__actions">
        {sizeOnly && available.length > 0 ? (
          <>
            <select className="select pcard__select" value={size} onChange={(e) => setSize(e.target.value)} aria-label={`Size for ${p.title}`}>
              <option value="">Size</option>
              {p.sizes.map((s) => (
                <option key={s.label} value={s.label} disabled={!s.available}>
                  {s.label}
                  {s.available ? '' : ' - sold out'}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn--primary btn--small" disabled={!size} onClick={quickAdd} title={size ? undefined : concept.y2k.pickSizeFirst} aria-label={`Add ${p.title}${size ? `, size ${size}` : ''} to bag`}>
              Add
            </button>
          </>
        ) : p.quickVariant && p.quickVariant.available ? (
          <button type="button" className="btn btn--primary btn--small" onClick={quickAdd} aria-label={`Add ${p.title} to bag`}>
            Add to bag
          </button>
        ) : (
          <Link className="btn btn--small" to={productPath(p.handle)} aria-label={`View ${p.title}`}>
            View item
          </Link>
        )}
        <FavoriteButton handle={p.handle} title={p.title} compact />
      </div>
      {menu.menu}
    </article>
  );
});
