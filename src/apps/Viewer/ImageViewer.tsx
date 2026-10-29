import { useEffect, useState } from 'react';
import { Icon } from '../../components/os/Icon';
import { Window } from '../../components/os/Window';
import { setWallpaperImage, type ViewerImage } from '../../lib/actions';
import { productPath, useBrowse } from '../../lib/useBrowse';
import { useFavorites } from '../../state/favorites';
import { useOS, type Win } from '../../state/os';

/** IYS IMAGE VIEWER — prev/next, zoom levels, set as wallpaper, view source. */
export default function ImageViewer({ win }: { win: Win }) {
  const images = (win.props.images as ViewerImage[]) ?? [];
  const [i, setI] = useState((win.props.index as number) ?? 0);
  const [zoom, setZoom] = useState<'fit' | 1 | 2>('fit');
  const [natural, setNatural] = useState(0);
  const browse = useBrowse();
  const fav = useFavorites();
  useEffect(() => {
    setI((win.props.index as number) ?? 0);
    setZoom('fit');
  }, [win.props.key, win.props.index]);
  const img = images[i];
  const n = images.length;
  useEffect(() => {
    if (img) useOS.getState().setTitle(win.id, `${img.filename ?? img.title} - IYS IMAGE VIEWER`);
  }, [img, win.id]);
  if (!img) return null;
  const go = (d: number) => {
    setZoom('fit');
    setI((x) => (x + d + n) % n);
  };

  return (
    <Window
      win={win}
      icon="image"
      label={`${img.title} - image viewer`}
      statusbar={
        <div className="statusbar">
          <span className="grow">{img.title}</span>
          {img.width && img.height ? (
            <span>
              {img.width} × {img.height}
            </span>
          ) : null}
          <span>
            {i + 1} / {n}
          </span>
          <span>{zoom === 'fit' ? 'Best fit' : `${Number(zoom) * 100}%`}</span>
        </div>
      }
    >
      <div
        className="viewer"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(1);
          if (e.key === 'ArrowLeft') go(-1);
        }}
      >
        <div className="viewer__bar" role="toolbar" aria-label="Viewer controls">
          <button type="button" className="btn btn--tool" onClick={() => go(-1)} disabled={n < 2} aria-label="Previous image">
            ◀
          </button>
          <button type="button" className="btn btn--tool" onClick={() => go(1)} disabled={n < 2} aria-label="Next image">
            ▶
          </button>
          <span className="toolbar__sep" aria-hidden="true" />
          <button type="button" className="btn btn--tool" aria-pressed={zoom === 'fit'} onClick={() => setZoom('fit')}>
            Best fit
          </button>
          <button type="button" className="btn btn--tool" aria-pressed={zoom === 1} onClick={() => setZoom(1)}>
            100%
          </button>
          <button type="button" className="btn btn--tool" aria-pressed={zoom === 2} onClick={() => setZoom(2)}>
            <Icon name="zoom" size={16} /> 200%
          </button>
          <span className="toolbar__sep" aria-hidden="true" />
          <button type="button" className="btn btn--tool" onClick={() => setWallpaperImage({ src: img.full ?? img.src, title: img.title, sourceUrl: img.sourceUrl })}>
            <Icon name="wallpaper" size={16} /> Set as wallpaper
          </button>
          {img.productHandle && (
            <>
              <button type="button" className="btn btn--tool" onClick={() => browse(productPath(img.productHandle!))}>
                <Icon name="product" size={16} /> Open product
              </button>
              <button type="button" className="btn btn--tool" aria-pressed={fav.handles.includes(img.productHandle)} onClick={() => fav.toggle(img.productHandle!)}>
                {fav.handles.includes(img.productHandle) ? '★' : '☆'} Favorite
              </button>
            </>
          )}
          {img.sourceUrl && (
            <a className="btn btn--tool" href={img.sourceUrl} target="_blank" rel="noopener noreferrer">
              View source ↗
            </a>
          )}
        </div>
        <div className={`viewer__stage viewer__stage--${zoom}`} tabIndex={0} aria-label={`${img.alt}. Use arrow keys for next and previous.`}>
          <img
            src={zoom === 'fit' ? img.src : img.full ?? img.src}
            alt={img.alt}
            onLoad={(e) => setNatural(e.currentTarget.naturalWidth)}
            style={zoom === 'fit' || !natural ? undefined : { width: natural * (zoom as number), maxWidth: 'none' }}
            decoding="async"
          />
        </div>
        {n > 1 && (
          <ul className="viewer__film" aria-label="Filmstrip">
            {images.map((im, k) => (
              <li key={im.src + k}>
                <button type="button" aria-current={k === i ? 'true' : undefined} aria-label={`Show ${im.filename ?? im.title}`} onClick={() => { setZoom('fit'); setI(k); }}>
                  <img src={im.src} alt="" loading="lazy" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Window>
  );
}
