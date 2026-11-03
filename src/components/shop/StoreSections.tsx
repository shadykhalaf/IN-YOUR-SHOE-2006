import { Link, useNavigate } from 'react-router';
import { collectionProducts } from '../../lib/catalogue/hydrate';
import { formatCount } from '../../lib/catalogue/format';
import type { Catalogue, Product } from '../../lib/catalogue/types';
import type { StoreHome, StoreSection } from '../../lib/storeHome';
import { collectionPath, productPath } from '../../lib/useBrowse';
import { Price, SaleBadge } from './Price';
import { RemoteImage } from './RemoteImage';
import { Icon } from '../os/Icon';

/**
 * The real store's homepage, section by section, in the order the store shows
 * them, drawn as 2000s web boxes. Every section links to the same collection
 * the store's does; products are this site's own (real, same handles).
 */
const cdn = (src: string, w: number) => `${src}${src.includes('?') ? '&' : '?'}width=${w}`;
const title = (cat: Catalogue, home: StoreHome, h: string, fallback = '') =>
  (fallback || cat.collections.get(h)?.title || home.collections[h]?.title || h.replace(/-/g, ' ')).toUpperCase();
const count = (cat: Catalogue, h: string) => cat.collections.get(h)?.count ?? 0;

function Strip({ products }: { products: Product[] }) {
  return (
    <ul className="strip">
      {products.map((p) => (
        <li key={p.handle}>
          <Link to={productPath(p.handle)}>
            <span className="strip__media">
              <RemoteImage src={p.image} alt="" title={p.title} width={p.imageWidth} height={p.imageHeight} base={240} sizes="144px" />
              {p.onSale && <SaleBadge />}
            </span>
            <span>{p.title}</span>
          </Link>
          <Price price={p.price} compareAt={p.compareAtPrice} />
        </li>
      ))}
    </ul>
  );
}

function Section({ s, cat, home, mobile }: { s: StoreSection; cat: Catalogue; home: StoreHome; mobile: boolean }) {
  const navigate = useNavigate();
  switch (s.type) {
    case 'hero':
      return (
        <>
          {s.slides.map((sl, i) => (
            <figure key={i} className="hero store-hero">
              <button type="button" className="hero__img" disabled={!sl.collection} onClick={() => sl.collection && navigate(collectionPath(sl.collection))} aria-label={sl.collection ? `Open ${title(cat, home, sl.collection)}` : 'Store banner'}>
                <picture>
                  {sl.mobileImage && <source media="(max-width: 700px)" srcSet={cdn(sl.mobileImage, 900)} />}
                  <img src={cdn(sl.image, 1600)} alt={sl.title || 'In Your Shoe homepage banner'} loading={i ? 'lazy' : 'eager'} />
                </picture>
              </button>
              <figcaption>
                {sl.title && <b>{sl.title} </b>}
                {sl.subheading && <span>{sl.subheading} </span>}
                {sl.collection ? (
                  <Link to={collectionPath(sl.collection)}>{(sl.label || title(cat, home, sl.collection)).toUpperCase()} ›</Link>
                ) : (
                  <span className="muted">as on inyourshoe.com right now</span>
                )}
              </figcaption>
            </figure>
          ))}
        </>
      );
    case 'announce':
      return (
        <div className="portal__announce store-announce">
          {s.items.map((t) => <span key={t}>{t}</span>)}
        </div>
      );
    case 'split':
      return (
        <section className="box store-split" aria-label={s.title || 'Shop'}>
          {s.title && <h2 className="box__title">{s.title.toUpperCase()}</h2>}
          <div className="store-split__row">
            {s.items.map((it) => (
              <Link key={it.collection} to={collectionPath(it.collection)} className="store-split__item">
                {it.image && <img src={cdn(it.image, 800)} alt="" loading="lazy" />}
                <span className={`btn ${it.collection === 'newest' ? 'btn--go' : 'btn--sky'} store-split__btn`}>
                  {(it.label || title(cat, home, it.collection)).toUpperCase()} › <small>{formatCount(count(cat, it.collection))}</small>
                </span>
              </Link>
            ))}
          </div>
        </section>
      );
    case 'stats':
      return (
        <div className="store-stats" role="list">
          {s.items.map((it) => (
            <span key={it.label} className="badge88 badge88--blue" role="listitem">
              <b>{it.number}</b>
              <small>{it.label}</small>
            </span>
          ))}
        </div>
      );
    case 'feature':
      return (
        <section className="box store-feature">
          {s.heading && <h2 className="box__title">{s.heading.toUpperCase()}</h2>}
          <div className="store-feature__row">
            {s.image && (
              <Link to={s.collection ? collectionPath(s.collection) : '/shop'} className="store-feature__img" tabIndex={-1} aria-hidden="true">
                <img src={cdn(s.image, 900)} alt="" loading="lazy" />
              </Link>
            )}
            <div className="store-feature__text">
              {s.subheading && <p className="muted">{s.subheading}</p>}
              {s.text && <p>{s.text}</p>}
              {s.collection && (
                <Link to={collectionPath(s.collection)} className="btn btn--go">
                  {(s.label || 'Shop now').toUpperCase()} › <small>{formatCount(count(cat, s.collection))}</small>
                </Link>
              )}
            </div>
          </div>
        </section>
      );
    case 'shelves':
      return (
        <>
          {s.items.map((it) => {
            const products = collectionProducts(cat, it.collection).slice(0, mobile ? 8 : 6);
            if (!products.length) return null;
            const name = title(cat, home, it.collection, it.title);
            return (
              <section key={it.collection} className="box box--shelf" aria-label={name}>
                <h2 className="box__title">{name}</h2>
                <Strip products={products} />
                <p className="box__more">
                  <Link to={collectionPath(it.collection)}>see all {formatCount(count(cat, it.collection))} in {name} ›</Link>
                </p>
              </section>
            );
          })}
        </>
      );
    case 'tiles':
      return (
        <section className="box store-tiles">
          {s.title && <h2 className="box__title box__title--coral">{s.title.toUpperCase()}</h2>}
          <ul className="store-tiles__grid">
            {s.items.map((it) => {
              const p = collectionProducts(cat, it.collection)[0];
              const name = title(cat, home, it.collection, it.label);
              return (
                <li key={it.collection}>
                  <Link to={collectionPath(it.collection)} className="store-tiles__tile">
                    <span className="store-tiles__img">
                      {it.image ? <img src={cdn(it.image, 500)} alt="" loading="lazy" /> : p ? <RemoteImage src={p.image} alt="" title={p.title} width={p.imageWidth} height={p.imageHeight} base={240} sizes="160px" /> : null}
                    </span>
                    <span className="store-tiles__name"><Icon name="folder" size={16} /> {name}</span>
                    <small>{formatCount(count(cat, it.collection))} items</small>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      );
    default:
      return null;
  }
}

export function StoreSections({ home, cat, mobile = false }: { home: StoreHome; cat: Catalogue; mobile?: boolean }) {
  return (
    <div className={`store-home${mobile ? ' store-home--m' : ''}`}>
      {home.sections.map((s, i) => (
        <Section key={i} s={s} cat={cat} home={home} mobile={mobile} />
      ))}
    </div>
  );
}
