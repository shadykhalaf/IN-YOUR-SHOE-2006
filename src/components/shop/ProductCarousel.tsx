import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { FEATURES } from '../../config/features';
import { concept } from '../../data/copy';
import { useCatalogue } from '../../lib/catalogue/load';
import { prefersReducedMotion } from '../../lib/motion';
import { moreLikeThis, type Pick } from '../../lib/recommend';
import { productPath } from '../../lib/useBrowse';
import { Price, SaleBadge } from './Price';
import { RemoteImage } from './RemoteImage';

/**
 * A row of real products that scrolls sideways INSIDE itself (touch, wheel,
 * ◀ ▶ buttons, arrow keys), in the same look as JUST DROPPED. The page itself
 * never scrolls sideways: the track is its own containing block and clips.
 */
export function ProductCarousel({ title, note, count, variant, children }: { title: string; note?: string; count: number; variant: 'desktop' | 'mobile'; children: ReactNode }) {
  const id = useId();
  const track = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const update = () => {
    const t = track.current;
    if (!t) return;
    setEdge({ start: t.scrollLeft <= 2, end: t.scrollLeft + t.clientWidth >= t.scrollWidth - 2 });
  };
  useEffect(() => {
    update();
    const t = track.current;
    if (!t || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(t);
    return () => ro.disconnect();
  }, [count]);
  const page = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  const mobile = variant === 'mobile';
  return (
    <section className={mobile ? 'm-panel reco reco--mobile' : 'box reco reco--desktop'} aria-labelledby={id} data-testid="reco">
      <div className="reco__head">
        <h2 className={mobile ? 'm-panel__title' : 'box__title'} id={id}>
          {title} {note && <small className={mobile ? 'm-panel__note' : undefined}>{note}</small>}
        </h2>
        <span className="reco__nav" data-repeatable>
          <button type="button" className="btn btn--small reco__arrow" aria-label={`${concept.reco.prev}: ${title}`} disabled={edge.start} onClick={() => page(-1)}>
            ◀
          </button>
          <button type="button" className="btn btn--small reco__arrow" aria-label={`${concept.reco.next}: ${title}`} disabled={edge.end} onClick={() => page(1)}>
            ▶
          </button>
        </span>
      </div>
      <ul
        ref={track}
        className="reco__track"
        data-carousel
        tabIndex={0}
        aria-label={concept.reco.trackLabel(title, count)}
        onScroll={update}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'ArrowRight') (e.preventDefault(), page(1));
          if (e.key === 'ArrowLeft') (e.preventDefault(), page(-1));
        }}
      >
        {children}
      </ul>
    </section>
  );
}

/** One product card: photo, name, real EGP price, why it's here. Opens the product (never adds by itself). */
export function RecoCard({ pick, onOpen }: { pick: Pick; onOpen?: (handle: string) => void }) {
  const p = pick.product;
  const sale = p.compareAtPrice !== null && p.price !== null && p.compareAtPrice > p.price;
  return (
    <li className="reco__item">
      <Link to={productPath(p.handle)} className="reco__card" onClick={onOpen ? (e) => (e.preventDefault(), onOpen(p.handle)) : undefined}>
        <span className="reco__img">
          <RemoteImage src={p.image} alt={p.title} title={p.title} width={p.imageWidth} height={p.imageHeight} base={240} max={480} sizes="150px" />
          {sale && <SaleBadge />}
        </span>
        <span className="reco__name">{p.title}</span>
        <Price price={p.price} compareAt={p.compareAtPrice} />
        <small className="reco__why">{pick.because}</small>
      </Link>
    </li>
  );
}

/** MORE LIKE THIS on every product page (desktop + mobile), below the purchase controls. */
export function MoreLikeThis({ handle, variant }: { handle: string; variant: 'desktop' | 'mobile' }) {
  const cat = useCatalogue();
  const picks = useMemo(() => (cat && FEATURES.productRecs ? moreLikeThis(cat, handle) : []), [cat, handle]);
  if (!picks.length) return null;
  return (
    <ProductCarousel title={concept.reco.productTitle} note={concept.reco.productNote} count={picks.length} variant={variant}>
      {picks.map((x) => (
        <RecoCard key={x.product.handle} pick={x} />
      ))}
    </ProductCarousel>
  );
}
