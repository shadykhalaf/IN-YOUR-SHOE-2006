import { Link } from 'react-router';
import { Icon } from '../../../components/os/Icon';
import { concept } from '../../../data/copy';
import { PageLoading } from '../../../components/shop/PageLoading';
import { ProductCard } from '../../../components/shop/ProductCard';
import { useCatalogue } from '../../../lib/catalogue/load';
import { usePage } from '../../../lib/usePage';
import { useFavorites } from '../../../state/favorites';

export default function Favorites() {
  const cat = useCatalogue();
  const handles = useFavorites((s) => s.handles);
  const remove = useFavorites((s) => s.remove);
  const items = cat ? handles.map((h) => cat.byHandle.get(h)).filter((p): p is NonNullable<typeof p> => Boolean(p)) : [];
  const gone = cat ? handles.filter((h) => !cat.byHandle.has(h)) : [];
  usePage('Favorites', `${items.length} favorite${items.length === 1 ? '' : 's'}.`);
  if (!cat) return <PageLoading />;
  return (
    <div className="page favorites">
      <header className="page__head">
        <h1 className="page__title">
          <Icon name="favorites" size={32} /> FAVORITES
        </h1>
        <p className="page__meta">Saved on this computer only (browser storage). {items.length} item(s).</p>
      </header>
      {items.length === 0 ? (
        <div className="empty">
          <p>
            <b>No favorites yet.</b> Press <b>☆</b> on any product to save it here.
          </p>
          <p>
            <Link className="btn btn--go btn--small" to="/collections/newest">
              {concept.y2k.shopNew}
            </Link>
          </p>
          <p>
            <Link to="/collections/pjoys">Start with Pjoys</Link> · <Link to="/shop">Shop all</Link>
          </p>
        </div>
      ) : (
        <ul className="grid">
          {items.map((p) => (
            <li key={p.handle}>
              <ProductCard p={p} />
            </li>
          ))}
        </ul>
      )}
      {gone.length > 0 && (
        <p className="page__note">
          {gone.length} saved item(s) are no longer in the current catalogue snapshot.{' '}
          <button type="button" className="link" onClick={() => gone.forEach(remove)}>
            Remove them
          </button>
        </p>
      )}
    </div>
  );
}
