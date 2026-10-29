import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { BagList } from '../../components/shop/BagList';
import { dcim } from '../../lib/dcim';
import { Icon } from '../../components/os/Icon';
import { FilterPanel } from '../../components/shop/FilterPanel';
import { Price } from '../../components/shop/Price';
import { RemoteImage } from '../../components/shop/RemoteImage';
import { EssentialLinks } from '../../components/shop/EssentialLinks';
import { BagIdeas, BagOffers, HandoffStatus, PromoCode, ShippingProgress, useHandoffPending } from '../../components/shop/BagExtras';
import { ESSENTIALS } from '../../data/essentials';
import { concept } from '../../data/copy';
import { MENU } from '../../data/taxonomy';
import { setWallpaperImage } from '../../lib/actions';
import { formatCount, formatEGP } from '../../lib/catalogue/format';
import { useCatalogue } from '../../lib/catalogue/load';
import { startCheckout, switchToRealIYS } from '../../lib/checkout';
import { chatScript } from '../../lib/chatScript';
import { prefersReducedMotion } from '../../lib/motion';
import { play, unlockAudio } from '../../lib/sound';
import { collectionPath, productPath } from '../../lib/useBrowse';
import { useShopQuery } from '../../lib/useShopQuery';
import { itemCount, subtotal, useCart } from '../../state/cart';
import { useOS } from '../../state/os';
import { usePreferences } from '../../state/preferences';
import { useClaimCenter } from './chrome';
import { useCatchyEnabled, writeEnabled } from '../../features/catchy/storage';

export function MBag({ close }: { close: () => void }) {
  const items = useCart((s) => s.items);
  const navigate = useNavigate();
  const leaving = useHandoffPending();
  useClaimCenter(items.length ? { label: 'CHECKOUT', run: () => startCheckout(), disabled: leaving } : null);
  const openProduct = (h: string) => {
    close();
    navigate(productPath(h));
  };
  return (
    <div className="m-page">
      <h1 className="m-h1">MY BAG ({itemCount(items)})</h1>
      <BagList onOpenProduct={openProduct} />
      {items.length === 0 && (
        <button type="button" className="btn btn--go m-add" onClick={() => { close(); navigate('/collections/newest'); }}>
          {concept.y2k.primary} ›
        </button>
      )}
      {items.length > 0 && (
        <div className="m-total">
          <ShippingProgress />
          <BagOffers />
          <div className="bag__total">
            <span>Subtotal</span>
            <b>{formatEGP(subtotal(items))}</b>
          </div>
          <p className="bag__note">{concept.y2k.bagNote}</p>
          <EssentialLinks className="bag__note" ids={['exchange-refund', 'shipping', 'terms-conditions']} />
          <PromoCode />
          <button type="button" className="btn btn--go m-add" onClick={() => startCheckout()} disabled={leaving} aria-busy={leaving}>
            {concept.y2k.bagCta}
          </button>
          <HandoffStatus />
        </div>
      )}
      {items.length > 0 && <BagIdeas onOpenProduct={openProduct} variant="mobile" />}
    </div>
  );
}

export function MCamera() {
  const folders = useMemo(dcim, []);
  const [folder, setFolder] = useState('PJOYS');
  const [view, setView] = useState<number | null>(null);
  const photos = folders[folder] ?? [];
  const ph = view !== null ? photos[view] : null;
  useClaimCenter(ph ? { label: 'WALLPAPER', run: () => setWallpaperImage({ src: ph.src, title: ph.title, sourceUrl: ph.sourceUrl }) } : null);
  if (ph)
    return (
      <div className="m-viewer">
        <img src={ph.src} alt={ph.alt} />
        <p className="m-viewer__cap">
          <b>{ph.filename}</b> · {ph.title}
        </p>
        <div className="m-product__row">
          <button type="button" className="btn" onClick={() => setView((v) => ((v ?? 0) - 1 + photos.length) % photos.length)}>
            ◀ Prev
          </button>
          <button type="button" className="btn" onClick={() => setView(null)}>
            Grid
          </button>
          <button type="button" className="btn" onClick={() => setView((v) => ((v ?? 0) + 1) % photos.length)}>
            Next ▶
          </button>
        </div>
      </div>
    );
  return (
    <div className="m-page">
      <h1 className="m-h1">CAMERA › DCIM</h1>
      <div className="m-tabs" role="tablist" aria-label="Folders">
        {Object.keys(folders).map((f) => (
          <button key={f} type="button" role="tab" aria-selected={f === folder} onClick={() => setFolder(f)}>
            {f} ({folders[f]!.length})
          </button>
        ))}
      </div>
      <ul className="m-photos">
        {photos.map((p, i) => (
          <li key={p.src}>
            <button type="button" onClick={() => setView(i)} aria-label={`Open ${p.filename}: ${p.alt}`}>
              <img src={p.src} alt="" loading="lazy" />
              <span>{p.filename}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="m-meta">Current official IYS photos. “TM▸2006” overlays are fictional.</p>
    </div>
  );
}

export function MChat({ close }: { close: () => void }) {
  const cat = useCatalogue();
  const navigate = useNavigate();
  const script = useMemo(() => (cat ? chatScript('pjoys', cat) : []), [cat]);
  const [shown, setShown] = useState(prefersReducedMotion() ? 99 : 0);
  useEffect(() => {
    if (shown >= script.length) return;
    const t = window.setTimeout(() => {
      setShown((n) => n + 1);
      if (shown === 1) play('ping');
    }, Math.min(900, script[shown]?.delay ?? 400));
    return () => window.clearTimeout(t);
  }, [shown, script]);
  useEffect(() => {
    document.querySelector('.m-content')?.scrollTo({ top: 1e6 });
  }, [shown]);
  useClaimCenter({ label: 'PJOYS', run: () => { close(); navigate('/collections/pjoys'); } });
  return (
    <div className="m-page m-chat" role="log" aria-live="polite" aria-label="Messages from PJOYS">
      <h1 className="m-h1">MESSAGES › PJOYS</h1>
      <p className="m-meta">2:13 AM · sleepover mode (concept)</p>
      {script.slice(0, shown).map((ev, i) => {
        if (ev.t === 'system') return <p key={i} className="chat__sys">{ev.text}</p>;
        if (ev.t === 'msg')
          return (
            <p key={i} className="m-bubble" lang={ev.lang}>
              {ev.text}
              {ev.note && <small> ({ev.note})</small>}
            </p>
          );
        if (ev.t === 'file')
          return (
            <button key={i} type="button" className="m-mms" onClick={() => { close(); navigate(productPath(ev.product.handle)); }}>
              {ev.local ? <img src={ev.image} alt="" /> : <RemoteImage src={ev.image} alt="" title={ev.product.title} base={360} sizes="60vw" />}
              <span>
                <b>{ev.product.title}</b>
                <Price price={ev.product.price} compareAt={ev.product.compareAtPrice} />
                <small>{ev.filename} · tap to open</small>
              </span>
            </button>
          );
        return (
          <div key={i} className="m-bubble">
            <p>pjoy_patterns.zip</p>
            <div className="tiles">
              {ev.tiles.map((t) => (
                <button key={t.src} type="button" className="tiles__img" style={{ backgroundImage: `url("${t.src}")` }} aria-label={`Set ${t.title} pattern as home wallpaper`} onClick={() => setWallpaperImage({ src: t.src, title: `${t.title} (pattern)`, sourceUrl: t.sourceUrl }, 'tile')} />
              ))}
            </div>
            <small>Tap a pattern to set it as your home wallpaper.</small>
          </div>
        );
      })}
    </div>
  );
}

export function MMenu({ close, openOverlay }: { close: () => void; openOverlay: (o: 'camera' | 'chat' | 'games') => void }) {
  const cat = useCatalogue();
  const navigate = useNavigate();
  const prefs = usePreferences();
  const catchy = useCatchyEnabled();
  useClaimCenter(null);
  return (
    <div className="m-page">
      <h1 className="m-h1">MENU</h1>
      <p className="m-meta">{concept.y2k.menuHint}</p>
      <ul className="m-menu">
        <li>
          <button type="button" onClick={() => openOverlay('chat')}>
            <Icon name="messenger" size={24} />
            <span>MESSAGES · PJOYS :)</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={() => openOverlay('camera')}>
            <Icon name="camera" size={24} />
            <span>CAMERA · DCIM</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={() => openOverlay('games')}>
            <Icon name="games" size={24} />
            <span>IYS GAMES · 6 GAMES</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={() => switchToRealIYS()}>
            <Icon name="internet" size={24} />
            <span>{concept.escape.menuItem}</span>
            <small>{concept.escape.menuSub}</small>
          </button>
        </li>
        {MENU.filter((m) => !m.collection || (cat?.collections.get(m.collection)?.count ?? 0) > 0).map((m) => (
          <li key={m.label}>
            <button type="button" onClick={() => { close(); navigate(m.to ?? collectionPath(m.collection)); }}>
              <Icon name={m.collection?.includes('pjoys') ? 'pjoys' : 'folder'} size={24} />
              <span>{m.label}</span>
              <small>{formatCount(m.collection ? cat?.collections.get(m.collection)?.count ?? 0 : cat?.products.length ?? 0)}</small>
            </button>
          </li>
        ))}
      </ul>
      <h2 className="m-h2">ESSENTIALS</h2>
      <ul className="m-menu" aria-label="Essentials">
        {ESSENTIALS.map((e) => (
          <li key={e.id}>
            <a className="m-menu__link" href={e.url} target="_blank" rel="noopener noreferrer">
              <Icon name="txt" size={24} />
              <span>{e.label} ↗</span>
            </a>
          </li>
        ))}
      </ul>
      <h2 className="m-h2">SETTINGS</h2>
      <label className="m-setting">
        <input type="checkbox" className="check" checked={prefs.sound} onChange={(e) => { prefs.setSound(e.target.checked); if (e.target.checked) { unlockAudio(); play('ping'); } }} />
        Sounds (off by default)
      </label>
      <label className="m-setting">
        <input type="checkbox" className="check" checked={prefs.crt} onChange={(e) => prefs.setCrt(e.target.checked)} />
        CRT filter
      </label>
      <label className="m-setting">
        <input type="checkbox" className="check" checked={catchy} onChange={(e) => writeEnabled(e.target.checked)} />
        Catchy on the home screen
      </label>
      <button type="button" className="btn" onClick={() => { prefs.reset(); useOS.getState().notify(concept.wallpaperUpdated); }}>
        Reset wallpaper
      </button>
      <h2 className="m-h2">ABOUT</h2>
      {concept.disclaimer.map((d) => (
        <p key={d} className="m-meta">
          {d}
        </p>
      ))}
    </div>
  );
}

export function MFilters({ close }: { close: () => void }) {
  const { result, q, setQuery, reset, departments } = useShopQuery();
  const navigate = useNavigate();
  useClaimCenter({ label: 'DONE', run: close });
  if (!result) return null;
  return (
    <div className="m-page m-filters">
      <h1 className="m-h1">SORT & FILTER</h1>
      <p className="m-meta">{formatCount(result.filtered.length)} products match</p>
      <FilterPanel q={q} facets={result.facets} onChange={setQuery} onReset={reset} departments={departments} onDepartment={(h) => { close(); navigate(h ? `/collections/${h}` : '/shop'); }} />
      <button type="button" className="btn btn--primary m-add" onClick={close}>
        Show {formatCount(result.filtered.length)} products
      </button>
    </div>
  );
}
