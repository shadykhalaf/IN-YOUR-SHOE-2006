import { useEffect, useLayoutEffect, useRef, useState, type ImgHTMLAttributes } from 'react';
import { concept } from '../../data/copy';
import { sized, srcSet } from '../../lib/catalogue/images';
import { Icon } from '../os/Icon';

/** A photo that's in view but still not here after this long counts as failed (Retry is offered). */
const STALL_MS = 25_000;

/**
 * While a photo is on its way: the ADD TO BAG flying-file look (shared CSS:
 * .fly-file + iys-fly + .progress), sized to its frame. Drawn only when its
 * frame is the positioned parent, so it can never cover or widen anything
 * else; hidden from screen readers (the <img> alt says what it is).
 */
function ImageLoading({ onStall }: { onStall: () => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  // 'measure' is laid out but invisible (display:none would hide the offsetParent we need to check).
  const [size, setSize] = useState<'measure' | 'off' | 'compact' | 'card' | 'gallery'>('measure');
  useLayoutEffect(() => {
    const el = ref.current;
    const frame = el?.parentElement;
    if (!el || !frame || el.offsetParent !== frame) return setSize('off');
    const w = frame.clientWidth;
    setSize(w < 90 ? 'compact' : w < 320 ? 'card' : 'gallery');
  }, []);
  const shown = size === 'compact' || size === 'card' || size === 'gallery';
  useEffect(() => {
    const frame = ref.current?.parentElement;
    if (!frame || typeof IntersectionObserver === 'undefined') return;
    let timer = 0;
    const io = new IntersectionObserver(([e]) => {
      window.clearTimeout(timer);
      if (e?.isIntersecting) timer = window.setTimeout(onStall, STALL_MS);
    });
    io.observe(frame);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [onStall]);
  return (
    <span ref={ref} className={`imgload imgload--${size}`} aria-hidden="true">
      {shown && size !== 'compact' && (
        <span className="imgload__anim">
          <Icon name="internet" size={size === 'gallery' ? 32 : 18} />
          <span className="fly-file imgload__file">
            <Icon name="image" size={size === 'gallery' ? 24 : 12} />
          </span>
          <Icon name="product" size={size === 'gallery' ? 32 : 18} />
        </span>
      )}
      {size === 'gallery' && <span className="imgload__label">{concept.loadingPhoto}</span>}
      {shown && (
        <span className="progress imgload__bar">
          <span className="progress__bar progress__bar--indeterminate" />
        </span>
      )}
    </span>
  );
}

/**
 * Official CDN product photo: lazy, async-decoded, responsive. If the remote
 * image ever disappears we show an honest period error box with the real
 * product title — never a substitute photo.
 */
export function RemoteImage({
  src,
  alt,
  width,
  height,
  sizes = '(max-width: 700px) 50vw, 240px',
  max = 1000,
  base = 480,
  title,
  sourceUrl,
  className,
  eager,
  actions = false,
  ...rest
}: {
  src: string | null;
  alt: string;
  width?: number | null;
  height?: number | null;
  sizes?: string;
  max?: number;
  base?: number;
  title?: string;
  sourceUrl?: string;
  className?: string;
  eager?: boolean;
  /** Show Retry / View original buttons (only where the image is NOT inside a link or button). */
  actions?: boolean;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height'>) {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const img = useRef<HTMLImageElement>(null);
  // Already in the browser cache: done before the first paint, so no loader flash.
  useLayoutEffect(() => {
    const el = img.current;
    if (state === 'loading' && el?.complete && el.naturalWidth > 0) setState('ok');
  }, [state, attempt, src]);
  if (!src || state === 'error') {
    return (
      <div className={`img-offline ${className ?? ''}`} role={actions ? 'group' : 'img'} aria-label={`${concept.imageOffline}: ${title ?? alt}`} style={{ aspectRatio: width && height ? `${width} / ${height}` : '4 / 5' }}>
        <b>{concept.imageOffline}</b>
        <span>{title ?? alt}</span>
        {actions && (
        <span className="img-offline__actions">
          {src && (
            <button
              type="button"
              className="btn btn--small"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setState('loading');
                setAttempt((a) => a + 1);
              }}
            >
              Retry
            </button>
          )}
          {sourceUrl && (
            <a className="btn btn--small" href={sourceUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              View original ↗
            </a>
          )}
        </span>
        )}
      </div>
    );
  }
  const isLocal = src.startsWith('/');
  return (
    <>
    <img
      ref={img}
      key={attempt}
      className={`${className ?? ''}${state === 'loading' ? ' is-loading' : ''}`}
      src={isLocal ? src : sized(src, base)}
      srcSet={isLocal ? undefined : srcSet(src, max)}
      sizes={isLocal ? undefined : sizes}
      alt={alt}
      width={width ?? undefined}
      height={height ?? undefined}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={() => setState('ok')}
      onError={() => setState('error')}
      {...rest}
    />
    {state === 'loading' && <ImageLoading key={attempt} onStall={() => setState('error')} />}
    </>
  );
}
