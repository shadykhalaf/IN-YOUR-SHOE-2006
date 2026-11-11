import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/os/Icon';
import { Window } from '../../components/os/Window';
import { concept } from '../../data/copy';
import { RECYCLE_BIN, type BinFolder, type BinPhoto } from '../../data/recycleBin';
import { openViewer } from '../../lib/actions';
import { decorativeFilename, plural } from '../../lib/catalogue/format';
import type { Win } from '../../state/os';

const openPhoto = (p: BinPhoto) =>
  openViewer([{ src: p.src, full: p.src, title: p.title, filename: decorativeFilename(p.title), alt: p.alt, width: p.width, height: p.height }]);

/**
 * Easter eggs (concept copy): BORING_OUTFITS, the one folder that stays empty, and a chain of
 * folders that begs you not to open it (src/data/recycleBin.ts).
 */
export default function RecycleBin({ win }: { win: Win }) {
  const [trail, setTrail] = useState<BinFolder[]>([]);
  const main = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const here = trail[trail.length - 1];
  const items = here ? here.items : RECYCLE_BIN;
  const folders = items.filter((i): i is BinFolder => i.kind === 'folder');
  const photos = items.filter((i): i is BinPhoto => i.kind === 'photo');
  const objects = items.length + (here ? 0 : 1); // the top level also shows BORING_OUTFITS
  const path = `C:\\IYS\\RECYCLE BIN\\${trail.map((f) => `${f.name}\\`).join('')}`;
  const go = (next: BinFolder[]) => {
    moved.current = true;
    setTrail(next);
  };
  // After opening a folder or going up, keyboard focus moves to the first thing in it.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    main.current?.querySelector<HTMLElement>('button')?.focus();
  }, [trail]);

  return (
    <Window
      win={win}
      icon="recycle"
      menubar={['File', 'Edit', 'View', 'Help']}
      statusbar={
        <div className="statusbar">
          <span className="grow">{plural(objects, 'object')}</span>
        </div>
      }
    >
      <div className="explorer">
        <div className="explorer__toolbar" role="toolbar" aria-label="Recycle Bin controls">
          <button type="button" className="btn btn--tool" disabled={!here} onClick={() => go(trail.slice(0, -1))} aria-label="Up one folder">
            <Icon name="folder" size={16} /> Up
          </button>
        </div>
        <div className="explorer__address">
          Address{' '}
          <span className="input input--tail" title={path}>
            <bdi dir="ltr">{path}</bdi>
          </span>
        </div>
        <div className="explorer__main win__scroll recycle" ref={main}>
          {(!here || folders.length > 0) && (
            <ul className="folders" aria-label="Folders">
              {!here && (
                <li>
                  <span className="folders__item">
                    <Icon name="folder" size={48} />
                    <span>{concept.recycle.folder}</span>
                    <small>0 items</small>
                  </span>
                </li>
              )}
              {folders.map((f) => (
                <li key={f.name}>
                  <button type="button" className="folders__item" onClick={() => go([...trail, f])}>
                    <Icon name="folder" size={48} />
                    <span>{f.name}</span>
                    <small>{plural(f.items.length, 'item')}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {photos.length > 0 && (
            <ul className="files" aria-label={`${here?.name ?? 'Recycle Bin'} items`}>
              {photos.map((p) => (
                <li key={p.id}>
                  <button type="button" className="files__item" onClick={() => openPhoto(p)} title={`${p.title} - open`}>
                    <span className="files__thumb">
                      <img src={p.thumb} alt="" width={96} height={128} loading="lazy" decoding="async" />
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
          {!here && (
            <>
              <p className="explorer__note">{concept.recycle.empty}</p>
              <p className="catchy">{concept.catchy.recycle}</p>
            </>
          )}
        </div>
      </div>
    </Window>
  );
}
