import { pageWindow } from '../../lib/catalogue/query';

/** « Previous 1 2 3 4 5 … 26 Next » — page count always computed. */
export function Pagination({ page, pageCount, onPage, label = 'Pages' }: { page: number; pageCount: number; onPage: (p: number) => void; label?: string }) {
  if (pageCount <= 1) return null;
  return (
    <nav className="pagination" aria-label={label}>
      <button type="button" className="link" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        « Previous
      </button>
      {pageWindow(page, pageCount).map((n, i) =>
        n === '…' ? (
          <span key={`gap${i}`} aria-hidden="true">
            …
          </span>
        ) : (
          <button key={n} type="button" className="link pagination__n" aria-current={n === page ? 'page' : undefined} aria-label={`Page ${n}`} onClick={() => onPage(n)}>
            {n}
          </button>
        ),
      )}
      <button type="button" className="link" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
        Next »
      </button>
    </nav>
  );
}
