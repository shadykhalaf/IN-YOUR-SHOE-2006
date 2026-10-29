import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/os/Icon';
import { Window } from '../../components/os/Window';
import { openViewer, setWallpaperImage } from '../../lib/actions';
import { dcim } from '../../lib/dcim';
import { prefersReducedMotion } from '../../lib/motion';
import { play } from '../../lib/sound';
import type { Win } from '../../state/os';

export default function Camera({ win }: { win: Win }) {
  const folders = useMemo(dcim, []);
  const names = Object.keys(folders);
  const [folder, setFolder] = useState((win.props.folder as string) ?? 'PJOYS');
  const [flash, setFlash] = useState(false);
  const photos = folders[folder] ?? [];

  useEffect(() => {
    if (prefersReducedMotion()) return;
    setFlash(true);
    play('shutter');
    const t = window.setTimeout(() => setFlash(false), 260);
    return () => window.clearTimeout(t);
  }, [folder]);

  return (
    <Window
      win={win}
      icon="camera"
      menubar={['File', 'Edit', 'View', 'Tools', 'Help']}
      statusbar={
        <div className="statusbar">
          <span className="grow">
            {photos.length} objects in DCIM\{folder}
          </span>
          <span>Official IYS photos · see SOURCES.md</span>
        </div>
      }
    >
      <div className="explorer">
        <div className="explorer__address">
          Address <span className="input">E:\DCIM\{folder}\</span>
        </div>
        <div className="explorer__split">
          <nav className="explorer__tree" aria-label="Camera folders">
            <p className="explorer__tree-root">
              <Icon name="camera" size={16} /> IYS CAMERA (E:)
            </p>
            <ul>
              <li>
                <p className="explorer__tree-node">
                  <Icon name="folder-open" size={16} /> DCIM
                </p>
                <ul>
                  {names.map((f) => (
                    <li key={f}>
                      <button type="button" className="explorer__tree-item" aria-current={f === folder ? 'true' : undefined} onClick={() => setFolder(f)}>
                        <Icon name={f === folder ? 'folder-open' : 'folder'} size={16} /> {f} <small>({folders[f]!.length})</small>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </nav>
          <div className="explorer__main win__scroll">
            {flash && <div className="camflash" aria-hidden="true" />}
            <ul className="contact" aria-label={`Photos in ${folder}`}>
              {photos.map((ph, i) => (
                <li key={ph.src}>
                  <button type="button" className="contact__frame" onClick={() => openViewer(photos, i, { title: ph.filename })} aria-label={`Open ${ph.filename}: ${ph.alt}`} title={ph.title}>
                    <span className="contact__photo">
                      <img src={ph.src} alt="" loading="lazy" decoding="async" />
                      <span className="contact__stamp" aria-hidden="true">
                        TM▸2006
                      </span>
                    </span>
                    <span className="contact__name">{ph.filename}</span>
                    <span className="contact__title">{ph.title}</span>
                  </button>
                  <button type="button" className="btn btn--small contact__wp" onClick={() => setWallpaperImage({ src: ph.src, title: ph.title, sourceUrl: ph.sourceUrl })}>
                    Set as wallpaper
                  </button>
                </li>
              ))}
            </ul>
            <p className="explorer__note">
              “TM▸2006” is the fictional time-machine overlay, not a capture date - these are current IYS photos.
            </p>
          </div>
        </div>
      </div>
    </Window>
  );
}
