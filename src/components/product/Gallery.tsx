import { useState } from 'react';
import { openViewer, setWallpaperImage } from '../../lib/actions';
import { sized } from '../../lib/catalogue/images';
import { Icon } from '../os/Icon';
import { toViewerImages, useImageMenu } from '../shop/ImageMenu';
import { RemoteImage } from '../shop/RemoteImage';

export interface GalleryImage {
  src: string;
  alt: string | null;
  width: number | null;
  height: number | null;
}

/**
 * Product photos framed as IYS IMAGE VIEWER: big, colour-accurate, touch
 * friendly. Filenames shown are decorative; the alt text is the real one.
 */
export function Gallery({ images, title, handle, sourceUrl }: { images: GalleryImage[]; title: string; handle: string; sourceUrl: string }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const n = images.length;
  const cur = images[Math.min(i, n - 1)];
  const menu = useImageMenu({ handle, title, images, index: i, sourceUrl });
  const go = (d: number) => {
    setZoom(false);
    setI((x) => (x + d + n) % n);
  };
  const filename = `IMG_${String(i + 1).padStart(4, '0')}.JPG`;

  return (
    <section className="gallery" aria-label={`${title} photos`}>
      <div className="gallery__bar" role="toolbar" aria-label="Image viewer controls">
        <button type="button" className="btn btn--tool" onClick={() => go(-1)} disabled={n < 2} aria-label="Previous image">
          ◀ Prev
        </button>
        <button type="button" className="btn btn--tool" onClick={() => go(1)} disabled={n < 2} aria-label="Next image">
          Next ▶
        </button>
        <button type="button" className="btn btn--tool" aria-pressed={zoom} onClick={() => setZoom((z) => !z)}>
          <Icon name="zoom" size={16} /> {zoom ? 'Zoom out' : 'Zoom in'}
        </button>
        <button type="button" className="btn btn--tool" onClick={() => openViewer(toViewerImages({ handle, title, images, sourceUrl }), i)}>
          <Icon name="image" size={16} /> View full size
        </button>
        <button type="button" className="btn btn--tool" onClick={() => cur && setWallpaperImage({ src: sized(cur.src, 1400), title, sourceUrl })}>
          <Icon name="wallpaper" size={16} /> Set as wallpaper
        </button>
        <span className="gallery__file" aria-hidden="true">
          {filename} · {i + 1}/{n}
        </span>
      </div>
      <div
        className={`gallery__stage${zoom ? ' is-zoomed' : ''}`}
        onContextMenu={menu.onContextMenu}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
          setZoom((z) => !z);
        }}
        onMouseMove={(e) => {
          if (!zoom) return;
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
        }}
      >
        {cur && (
          <RemoteImage
            key={cur.src}
            src={cur.src}
            alt={cur.alt || `${title}, photo ${i + 1} of ${n}`}
            title={title}
            width={cur.width}
            height={cur.height}
            sourceUrl={sourceUrl}
            base={800}
            max={1400}
            sizes="(max-width: 1100px) 60vw, 560px"
            eager
            actions
            style={{ transformOrigin: origin }}
          />
        )}
      </div>
      {n > 1 && (
        <ul className="gallery__thumbs" aria-label="Thumbnails">
          {images.map((im, k) => (
            <li key={im.src}>
              <button type="button" aria-label={`Show photo ${k + 1} of ${n}`} aria-current={k === i ? 'true' : undefined} onClick={() => { setZoom(false); setI(k); }}>
                <RemoteImage src={im.src} alt="" title={title} base={120} max={180} sizes="64px" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {menu.menu}
    </section>
  );
}
