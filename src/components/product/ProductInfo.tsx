import type { ProductDetail } from '../../lib/catalogue/types';

/**
 * Description (starts open on every product) and, directly below it, the
 * product's official Care Guide (starts closed; omitted when none is
 * published). Keyed by handle so each product starts in these states, while a
 * visitor's own open/close is respected for as long as they stay on it.
 */
export function ProductInfo({ p }: { p: ProductDetail }) {
  return (
    <>
      {p.description && (
        <details key={`desc-${p.handle}`} className="props__desc" open>
          <summary>Description</summary>
          <p>{p.description}</p>
        </details>
      )}
      {p.careGuide && (
        <details key={`care-${p.handle}`} className="props__desc props__care">
          <summary>Care Guide</summary>
          <p>{p.careGuide}</p>
        </details>
      )}
    </>
  );
}
