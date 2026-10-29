import { useState } from 'react';
import { Icon } from '../os/Icon';
import { Busy } from '../shop/Busy';
import { concept } from '../../data/copy';
import type { ProductDetail } from '../../lib/catalogue/types';
import { useSizeChart } from '../../lib/sizeCharts';

/** Size-applicable = the product has a size option (opening the guide never picks one). */
export const hasSizes = (p: ProductDetail) => Boolean(p.sizeOption) || p.sizes.length > 0;

export function SizeGuideButton({ onOpen, expanded, controls }: { onOpen: () => void; expanded?: boolean; controls?: string }) {
  return (
    <button type="button" className="btn btn--small sizeguide__open" onClick={onOpen} aria-expanded={expanded} aria-controls={controls}>
      <Icon name="ruler" size={16} /> {concept.sizeGuide.button}
    </button>
  );
}

/**
 * The official chart(s) IYS shows on the product page, as published (image,
 * original units). 100% fits the panel; 200% scrolls inside it, never the page.
 * No chart → says so and offers a way to ask IYS. Nothing is ever estimated.
 */
export function SizeChartView({ handle, title, sourceUrl, ask }: { handle: string; title: string; sourceUrl: string; ask: { label: string; run?: () => void; href?: string } }) {
  const state = useSizeChart(handle);
  const [zoom, setZoom] = useState<1 | 2>(1);
  const [retry, setRetry] = useState(0);
  if (state.status === 'loading') return <Busy label={concept.sizeGuide.loading} />;
  if (state.status === 'error')
    return (
      <div className="sizeguide__msg" key={retry}>
        <p>{concept.sizeGuide.error}</p>
        <button type="button" className="btn btn--small" onClick={() => setRetry((n) => n + 1)}>
          Retry
        </button>
      </div>
    );
  if (state.status === 'none')
    return (
      <div className="sizeguide__msg">
        <p>
          <Icon name="info" size={16} /> {state.gone ? concept.sizeGuide.gone : concept.sizeGuide.missing}
        </p>
        <p className="sizeguide__actions">
          {ask.href ? (
            <a className="btn btn--small" href={ask.href} target="_blank" rel="noopener noreferrer">
              {ask.label}
            </a>
          ) : (
            <button type="button" className="btn btn--small" onClick={ask.run}>
              {ask.label}
            </button>
          )}
          <a className="btn btn--small" href={sourceUrl} target="_blank" rel="noopener noreferrer">
            {concept.y2k.seeOnIys}
          </a>
        </p>
        <p className="sizeguide__note">Checked on inyourshoe.com {state.checkedOn}.</p>
      </div>
    );
  return (
    <div className="sizeguide">
      <div className="sizeguide__bar" role="group" aria-label="Zoom" data-repeatable>
        <span>Zoom:</span>
        {([1, 2] as const).map((z) => (
          <button key={z} type="button" className="btn btn--small" aria-pressed={zoom === z} onClick={() => setZoom(z)}>
            {z * 100}%
          </button>
        ))}
      </div>
      {state.images.map((im, i) => (
        <figure key={im.src} className="sizeguide__fig">
          <div className="sizeguide__scroll" tabIndex={zoom === 2 ? 0 : -1} aria-label={zoom === 2 ? 'Size chart, zoomed: scroll to see all of it' : undefined}>
            <img
              src={`${im.src}${im.src.includes('?') ? '&' : '?'}width=${zoom === 2 ? 1600 : 900}`}
              alt={`Official IYS size chart for ${title}${state.images.length > 1 ? ` (${i + 1} of ${state.images.length})` : ''}`}
              width={im.width ?? undefined}
              height={im.height ?? undefined}
              style={{ width: `${zoom * 100}%` }}
              loading="lazy"
              decoding="async"
            />
          </div>
          <figcaption>
            <a href={im.src} target="_blank" rel="noopener noreferrer">
              open full size ↗
            </a>
          </figcaption>
        </figure>
      ))}
      <p className="sizeguide__note">{concept.sizeGuide.source(state.checkedOn)}</p>
    </div>
  );
}
