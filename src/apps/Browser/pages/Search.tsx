import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Icon } from '../../../components/os/Icon';
import { Busy } from '../../../components/shop/Busy';
import { Pagination } from '../../../components/shop/Pagination';
import { Price } from '../../../components/shop/Price';
import { RemoteImage } from '../../../components/shop/RemoteImage';
import { formatCount } from '../../../lib/catalogue/format';
import { paginate } from '../../../lib/catalogue/query';
import { usePage } from '../../../lib/usePage';
import { productPath } from '../../../lib/useBrowse';
import { useSearch } from '../../../lib/useSearch';

const PER = 20;
const TRY = ['cairo', 'pjoys', 'hoodie', 'ceral', 'socks', 'kids', 'jeans', 'black', 'هودي', 'بنطلون اسود'];

export default function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const page = Number(params.get('page') ?? '1') || 1;
  const [typed, setTyped] = useState(q);
  const { cat, results, ms, pending, understood } = useSearch(q);
  useEffect(() => setTyped(q), [q]);
  const pg = results ? paginate(results, page, PER) : null;
  usePage(q ? `${q} - Search` : 'Search', pending ? 'Searching...' : results ? `${formatCount(results.length)} products found.` : 'Done.');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = typed.trim();
    setParams(v ? { q: v } : {});
  };

  return (
    <div className="page search">
      <form className="search__box" onSubmit={submit} role="search">
        <h1 className="search__title">
          <Icon name="search" size={32} /> SEARCH THE IYS INTERNET
        </h1>
        <div className="search__row">
          <label htmlFor="iys-search" className="sr-only">
            Search {cat ? formatCount(cat.products.length) : ''} products
          </label>
          <input id="iys-search" className="input search__input" type="search" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="e.g. cairo, pjoys, hoodie" autoComplete="off" data-autofocus />
          <button type="submit" className="btn btn--primary">
            Search
          </button>
        </div>
        <p className="search__hint">
          Searching {cat ? formatCount(cat.products.length) : '…'} real products by name, type, collection and tags. Typos are OK, and so is Arabic.{' '}
          {!q && (
            <>
              Try:{' '}
              {TRY.map((t, i) => (
                <span key={t}>
                  <Link to={`/search?q=${encodeURIComponent(t)}`} dir="auto">
                    {t}
                  </Link>
                  {i < TRY.length - 1 ? ', ' : ''}
                </span>
              ))}
            </>
          )}
        </p>
      </form>

      {q && pg && results && (
        <section aria-label="Search results" className="results">
          <p className="results__meta">
            Results <b>{formatCount(pg.from)}</b> - <b>{formatCount(pg.to)}</b> of <b>{formatCount(pg.total)}</b> for <b dir="auto">{q}</b> ({(ms / 1000).toFixed(3)} seconds)
          </p>
          {understood && understood.length > 0 && (
            <p className="results__understood">
              IYS understood: <b>{understood.join(' · ')}</b>
            </p>
          )}
          {pg.total === 0 ? (
            <div className="empty">
              <p>
                Your search - <b dir="auto">{q}</b> - did not match any products in this snapshot.
              </p>
              <p>
                Try different words, or <Link to="/shop">browse the whole shop</Link>.
              </p>
              <p>
                <Link className="btn btn--go btn--small" to="/shop">
                  SHOP ALL
                </Link>{' '}
                <Link className="btn btn--small" to="/collections/newest">
                  NEW STUFF
                </Link>
              </p>
            </div>
          ) : (
            <ol className="results__list" start={pg.from}>
              {pg.items.map((p) => (
                <li key={p.handle} className="result">
                  <Link to={productPath(p.handle)} className="result__thumb" tabIndex={-1} aria-hidden="true">
                    <RemoteImage src={p.image} alt="" title={p.title} base={180} sizes="90px" max={240} />
                  </Link>
                  <div>
                    <h2 className="result__title">
                      <Link to={productPath(p.handle)}>{p.title}</Link>
                    </h2>
                    <p className="result__url">www.inyourshoe.com/products/{p.handle}</p>
                    <p className="result__text">
                      <Price price={p.price} compareAt={p.compareAtPrice} />
                      {' - '}
                      {[p.productType, p.available === false ? 'Out of stock' : null, p.sizes.length ? `Sizes ${p.sizes.map((s) => s.label).join(', ')}` : null].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <Pagination page={pg.page} pageCount={pg.pageCount} onPage={(n) => setParams({ q, page: String(n) })} label="Result pages" />
        </section>
      )}
      {q && !results && (
        <p className="results__meta">
          <Busy inline label="Searching..." />
        </p>
      )}
    </div>
  );
}
