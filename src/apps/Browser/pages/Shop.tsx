import { Link, useNavigate } from 'react-router';
import { FilterPanel } from '../../../components/shop/FilterPanel';
import { PageLoading } from '../../../components/shop/PageLoading';
import { Pagination } from '../../../components/shop/Pagination';
import { ProductCard } from '../../../components/shop/ProductCard';
import meta from '../../../data/catalogue-meta.json';
import { formatCount } from '../../../lib/catalogue/format';
import { toParams } from '../../../lib/catalogue/query';
import { usePage } from '../../../lib/usePage';
import { collectionTitle, useShopQuery } from '../../../lib/useShopQuery';
import NotFound from './NotFound';

export default function Shop() {
  const navigate = useNavigate();
  const { cat, q, result, setQuery, reset, handle, collection, notFound, departments } = useShopQuery();
  const title = handle ? collectionTitle(handle, collection?.title) : 'Shop All';
  const status = result ? (result.page.total ? `${formatCount(result.page.to - result.page.from + 1)} of ${formatCount(result.page.total)} products.` : '0 products found.') : 'Opening page...';
  usePage(title, status);

  if (notFound) return <NotFound />;
  if (!cat || !result) return <PageLoading label="Loading products..." />;
  const { page, facets } = result;
  const goPage = (n: number) => setQuery({ page: n });

  return (
    <div className="page shop">
      <p className="crumbs">
        <Link to="/">Home</Link> › {handle ? <Link to="/shop">Shop</Link> : 'Shop'}
        {handle && <> › {title}</>}
      </p>
      <header className="page__head">
        <h1 className="page__title">{title.toUpperCase()}</h1>
        <p className="page__meta">
          {page.total ? (
            <>
              Showing <b>{formatCount(page.from)}–{formatCount(page.to)}</b> of <b>{formatCount(page.total)}</b> products
            </>
          ) : (
            'No products match these filters.'
          )}
          {' · '}page {page.page} of {page.pageCount}
        </p>
        {!handle && (
          <p className="page__note">
            Every public product on the Egyptian store: <b>{formatCount(meta.publicProductsTotal)}</b>. IYS’s own “All Products” collection lists{' '}
            <Link to="/collections/all-products">{formatCount(meta.allProductsCollectionCount)}</Link>; the other {formatCount(meta.productsOutsideAllProducts.count)} are public collaboration pieces (e.g.{' '}
            <Link to="/collections/inyourshoexzed">IYS × ZED</Link>). Prices in EGP as of {meta.generatedAt.slice(0, 10)}.
          </p>
        )}
      </header>
      <div className="shop__layout">
        <FilterPanel
          q={q}
          facets={facets}
          onChange={setQuery}
          onReset={reset}
          departments={departments}
          onDepartment={(h) => navigate({ pathname: h ? `/collections/${h}` : '/shop', search: toParams({ ...q, collection: null, page: 1, types: [], sizes: [] }).toString() })}
        />
        <section className="shop__results" aria-label={`${title} products`}>
          <Pagination page={page.page} pageCount={page.pageCount} onPage={goPage} label="Pages (top)" />
          {page.items.length ? (
            <ul className="grid" aria-label={`Page ${page.page} of ${page.pageCount}`}>
              {page.items.map((p, i) => (
                <li key={p.handle}>
                  <ProductCard p={p} eager={i < 8} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">
              <p>
                <b>0 products found.</b> Try removing a filter.
              </p>
              <button type="button" className="btn" onClick={reset}>
                Reset filters
              </button>
            </div>
          )}
          <Pagination page={page.page} pageCount={page.pageCount} onPage={goPage} label="Pages (bottom)" />
        </section>
      </div>
    </div>
  );
}
