import { formatEGP } from '../../lib/catalogue/format';

/** Real EGP price; compare-at + SALE! only when the public data has them. No invented percentages. */
export function Price({ price, compareAt, from, large }: { price: number | null; compareAt?: number | null; from?: boolean; large?: boolean }) {
  const sale = compareAt !== null && compareAt !== undefined && price !== null && compareAt > price;
  return (
    <span className={`price${large ? ' price--large' : ''}${sale ? ' price--sale' : ''}`}>
      {from && <span className="price__from">from </span>}
      {sale && (
        <>
          <s className="price__was" aria-label={`Was ${formatEGP(compareAt)}`}>
            {formatEGP(compareAt)}
          </s>{' '}
        </>
      )}
      <b className="price__now">
        {sale && <span className="sr-only">Now </span>}
        {formatEGP(price)}
      </b>
    </span>
  );
}

export function SaleBadge() {
  return (
    <span className="sale-badge" aria-label="On sale">
      SALE!
    </span>
  );
}

export function StockNote({ available }: { available: boolean | null }) {
  if (available === null) return null;
  return <span className={`stock ${available ? 'stock--in' : 'stock--out'}`}>{available ? 'IN STOCK' : 'OUT OF STOCK'}</span>;
}
