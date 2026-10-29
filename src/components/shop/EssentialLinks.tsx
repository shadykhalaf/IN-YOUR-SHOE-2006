import { Fragment } from 'react';
import { essential } from '../../data/essentials';
import { useOS } from '../../state/os';

/**
 * Inline row of official IYS policy links (opens inyourshoe.com in a new tab),
 * rendered inside whatever existing text style the parent already uses.
 * `more` adds a link that opens the IYS ESSENTIALS window.
 */
export function EssentialLinks({ ids, label, more = false, className }: { ids: string[]; label?: string; more?: boolean; className?: string }) {
  return (
    <p className={className}>
      {label && <>{label} </>}
      {ids.map((id, i) => {
        const e = essential(id);
        return (
          <Fragment key={id}>
            {i > 0 && ' · '}
            <a href={e.url} target="_blank" rel="noopener noreferrer" title={`${e.title} on inyourshoe.com`}>
              {e.short} ↗
            </a>
          </Fragment>
        );
      })}
      {more && (
        <>
          {' · '}
          <button type="button" className="link" onClick={() => useOS.getState().open('essentials')}>
            All essentials
          </button>
        </>
      )}
    </p>
  );
}
