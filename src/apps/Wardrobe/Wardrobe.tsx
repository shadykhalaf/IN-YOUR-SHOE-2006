import { useMemo, useState } from 'react';
import { Icon } from '../../components/os/Icon';
import { Window } from '../../components/os/Window';
import { Pagination } from '../../components/shop/Pagination';
import { Price } from '../../components/shop/Price';
import { RemoteImage } from '../../components/shop/RemoteImage';
import { WARDROBE, type Folder } from '../../data/taxonomy';
import { collectionProducts } from '../../lib/catalogue/hydrate';
import { decorativeFilename, formatCount } from '../../lib/catalogue/format';
import { useCatalogue } from '../../lib/catalogue/load';
import { paginate } from '../../lib/catalogue/query';
import type { Catalogue } from '../../lib/catalogue/types';
import { collectionPath, productPath, useBrowse } from '../../lib/useBrowse';
import type { Win } from '../../state/os';

const count = (cat: Catalogue | null, f: Folder) => cat?.collections.get(f.collection)?.count ?? 0;
const findPath = (list: Folder[], id: string, trail: Folder[] = []): Folder[] | null => {
  for (const f of list) {
    if (f.collection === id) return [...trail, f];
    const hit = f.children && findPath(f.children, id, [...trail, f]);
    if (hit) return hit;
  }
  return null;
};

export default function Wardrobe({ win }: { win: Win }) {
  const cat = useCatalogue();
  const browse = useBrowse();
  const [current, setCurrent] = useState<string | null>((win.props.folder as string) ?? null);
  const [open, setOpen] = useState<Set<string>>(new Set(['all-tops']));
  const [view, setView] = useState<'thumbs' | 'details'>('thumbs');
  const [page, setPage] = useState(1);
  const visible = (list: Folder[]) => list.filter((f) => count(cat, f) > 0);
  const trail = current ? findPath(WARDROBE, current) ?? [] : [];
  const folder = trail[trail.length - 1] ?? null;
  const subfolders = folder ? visible(folder.children ?? []) : visible(WARDROBE);
  const items = useMemo(() => (cat && folder ? collectionProducts(cat, folder.collection) : []), [cat, folder]);
  const pg = paginate(items, page, 48);
  const go = (id: string | null) => {
    setCurrent(id);
    setPage(1);
    if (id) setOpen((s) => new Set([...s, ...(findPath(WARDROBE, id) ?? []).map((f) => f.collection)]));
  };
  const path = `C:\\IYS\\WARDROBE\\${trail.map((f) => f.label.replace(/[^A-Z0-9 &x]/gi, '')).join('\\')}${trail.length ? '\\' : ''}`;

  const renderTree = (list: Folder[], depth: number): React.ReactNode => (
    <ul role={depth === 0 ? 'tree' : 'group'} aria-label={depth === 0 ? 'Wardrobe folders' : undefined}>
      {visible(list).map((f) => {
        const kids = visible(f.children ?? []);
        const expanded = open.has(f.collection);
        return (
          <li key={f.collection} role="treeitem" aria-expanded={kids.length ? expanded : undefined} aria-selected={current === f.collection}>
            <span className="explorer__tree-row">
              {kids.length > 0 ? (
                <button type="button" className="explorer__twisty" aria-label={`${expanded ? 'Collapse' : 'Expand'} ${f.label}`} onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(f.collection)) n.delete(f.collection); else n.add(f.collection); return n; })}>
                  {expanded ? '−' : '+'}
                </button>
              ) : (
                <span className="explorer__twisty" aria-hidden="true" />
              )}
              <button type="button" className="explorer__tree-item" aria-current={current === f.collection ? 'true' : undefined} onClick={() => go(f.collection)}>
                <Icon name={current === f.collection ? 'folder-open' : 'folder'} size={16} /> {f.label} <small>({formatCount(count(cat, f))})</small>
              </button>
            </span>
            {kids.length > 0 && expanded && renderTree(kids, depth + 1)}
          </li>
        );
      })}
    </ul>
  );

  return (
    <Window
      win={win}
      icon="wardrobe"
      menubar={['File', 'Edit', 'View', 'Favorites', 'Tools', 'Help']}
      statusbar={
        <div className="statusbar">
          <span className="grow">
            {folder ? `${formatCount(items.length)} objects` : `${subfolders.length} folders`} {folder && items.length > 48 ? `(showing ${pg.from}–${pg.to})` : ''}
          </span>
          <span>Counts from the catalogue snapshot</span>
        </div>
      }
    >
      <div className="explorer">
        <div className="explorer__toolbar" role="toolbar" aria-label="Wardrobe controls">
          <button type="button" className="btn btn--tool" disabled={!folder} onClick={() => go(trail.length > 1 ? trail[trail.length - 2]!.collection : null)} aria-label="Up one folder">
            <Icon name="folder" size={16} /> Up
          </button>
          <span className="toolbar__sep" aria-hidden="true" />
          <button type="button" className="btn btn--tool" aria-pressed={view === 'thumbs'} onClick={() => setView('thumbs')}>
            Thumbnails
          </button>
          <button type="button" className="btn btn--tool" aria-pressed={view === 'details'} onClick={() => setView('details')}>
            Details
          </button>
          {folder && (
            <button type="button" className="btn btn--tool" onClick={() => browse(collectionPath(folder.collection))}>
              <Icon name="internet" size={16} /> Open in IYS INTERNET
            </button>
          )}
        </div>
        <div className="explorer__address">
          Address <span className="input">{path}</span>
        </div>
        <div className="explorer__split">
          <nav className="explorer__tree" aria-label="Folders">
            <button type="button" className="explorer__tree-root" onClick={() => go(null)}>
              <Icon name="wardrobe" size={16} /> MY WARDROBE
            </button>
            {renderTree(WARDROBE, 0)}
          </nav>
          <div className="explorer__main win__scroll">
            {!cat ? (
              <p className="explorer__note">Reading folders...</p>
            ) : (
              <>
                {subfolders.length > 0 && (
                  <ul className="folders" aria-label="Folders">
                    {subfolders.map((f) => (
                      <li key={f.collection}>
                        <button type="button" className="folders__item" onClick={() => go(f.collection)} title={`${formatCount(count(cat, f))} items`}>
                          <Icon name="folder" size={48} />
                          <span>{f.label}</span>
                          <small>{formatCount(count(cat, f))} items</small>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {folder && view === 'thumbs' && (
                  <ul className="files" aria-label={`${folder.label} items`}>
                    {pg.items.map((p) => (
                      <li key={p.handle}>
                        <button type="button" className="files__item" onClick={() => browse(productPath(p.handle))} title={`${p.title} - open`}>
                          <span className="files__thumb">
                            <RemoteImage src={p.image} alt="" title={p.title} base={180} sizes="96px" max={240} />
                          </span>
                          <span className="files__name" aria-hidden="true">
                            {decorativeFilename(p.title)}
                          </span>
                          <span className="files__title">{p.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {folder && view === 'details' && (
                  <table className="details">
                    <caption className="sr-only">{folder.label} items</caption>
                    <thead>
                      <tr>
                        <th scope="col">Name</th>
                        <th scope="col">Type</th>
                        <th scope="col">Price</th>
                        <th scope="col">Sizes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pg.items.map((p) => (
                        <tr key={p.handle}>
                          <td>
                            <button type="button" className="link" onClick={() => browse(productPath(p.handle))}>
                              <Icon name="image" size={16} /> {p.title}
                            </button>
                          </td>
                          <td>{p.productType ?? '-'}</td>
                          <td>
                            <Price price={p.price} compareAt={p.compareAtPrice} />
                          </td>
                          <td>{p.sizes.map((s) => s.label).join(', ') || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {folder && <Pagination page={pg.page} pageCount={pg.pageCount} onPage={setPage} label="Folder pages" />}
                {folder && <p className="explorer__note">Filenames are decorative. Product titles are the official ones.</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </Window>
  );
}
