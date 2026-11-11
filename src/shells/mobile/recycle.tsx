import { useEffect, useRef } from 'react';
import { Icon } from '../../components/os/Icon';
import { concept } from '../../data/copy';
import { RECYCLE_BIN, type BinFolder, type BinItem, type BinPhoto } from '../../data/recycleBin';
import { decorativeFilename, plural } from '../../lib/catalogue/format';
import { useClaimCenter } from './chrome';

/**
 * Mobile RECYCLE BIN: the same folders as the desktop bin (src/data/recycleBin.ts).
 * `trail` is what's open, from the top: folders, then the photo. ◀ BACK (MobileShell) drops the
 * last one, so it goes up a level at a time.
 */
export function MRecycle({ trail, setTrail, close }: { trail: BinItem[]; setTrail: (t: BinItem[]) => void; close: () => void }) {
  useClaimCenter({ label: 'HOME', run: close });
  const page = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  // Each step in or out starts at the top, with focus on the first thing there.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    document.querySelector('.m-content')?.scrollTo(0, 0);
    page.current?.querySelector<HTMLElement>('button')?.focus();
  }, [trail]);
  const last = trail[trail.length - 1];

  if (last?.kind === 'photo')
    return (
      <div className="m-viewer" ref={page}>
        <img src={last.src} alt={last.alt} width={last.width} height={last.height} />
        <p className="m-viewer__cap">
          <b>{decorativeFilename(last.title)}</b> · {last.title}
        </p>
      </div>
    );

  const items = last ? last.items : RECYCLE_BIN;
  const folders = items.filter((i): i is BinFolder => i.kind === 'folder');
  const photos = items.filter((i): i is BinPhoto => i.kind === 'photo');
  const path = `C:\\IYS\\RECYCLE BIN\\${trail.map((f) => (f.kind === 'folder' ? `${f.name}\\` : '')).join('')}`;
  return (
    <div className="m-page" ref={page}>
      <h1 className="m-h1">{last ? last.name : concept.recycle.title}</h1>
      <p className="m-meta m-recycle__path">{path}</p>
      {(!last || folders.length > 0) && (
        <ul className="m-menu" aria-label="Folders">
          {!last && (
            <li>
              <span className="m-menu__static">
                <Icon name="folder" size={24} />
                <span>{concept.recycle.folder}</span>
                <small>0 items</small>
              </span>
            </li>
          )}
          {folders.map((f) => (
            <li key={f.name}>
              <button type="button" onClick={() => setTrail([...trail, f])}>
                <Icon name="folder" size={24} />
                <span>{f.name}</span>
                <small>{plural(f.items.length, 'item')}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
      {photos.length > 0 && (
        <ul className="m-photos m-photos--portrait" aria-label={`Photos in ${last?.name ?? concept.recycle.title}`}>
          {photos.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => setTrail([...trail, p])} aria-label={`Open ${decorativeFilename(p.title)}: ${p.title}`}>
                <img src={p.thumb} alt="" loading="lazy" />
                <span>{decorativeFilename(p.title)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!last && (
        <>
          <p className="m-meta">{concept.recycle.empty}</p>
          <p className="catchy">{concept.catchy.recycle}</p>
        </>
      )}
    </div>
  );
}
