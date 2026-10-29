import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router';
import { Dialogs } from '../components/os/Dialogs';
import { Icon } from '../components/os/Icon';
import { RealSwitch } from '../components/os/RealSwitch';
import { CRT, TransferDialog } from '../components/os/Overlays';
import { brand } from '../data/assets';
import { concept } from '../data/copy';
import { useCatalogue } from '../lib/catalogue/load';
import { play } from '../lib/sound';
import { collectionTitle } from '../lib/useShopQuery';
import { itemCount, useCart } from '../state/cart';
import { watchRageClicks } from '../lib/frustration';
import { useOS } from '../state/os';
import { usePjoysUnread, useSession } from '../state/preferences';
import { FEATURES } from '../config/features';
import storesData from '../data/stores.generated.json';
import { gameMeta, type GameId } from '../games/registry';
import { MBar, StatusBar, useCenterKey, type BarKey } from './mobile/chrome';
import { MGames } from './mobile/games';
import { MBag, MCamera, MChat, MFilters, MMenu } from './mobile/overlays';
import { MFavorites, MHome, MList, MNotFound, MProduct, MSearch, MStores, type Overlay } from './mobile/screens';
import '../styles/os.css';
import '../styles/apps.css';
import '../styles/mobile.css';

const OVERLAY_TITLES: Record<Exclude<Overlay, null>, string> = { bag: 'MY BAG', camera: 'CAMERA', chat: 'MESSAGES', menu: 'MENU', filters: 'OPTIONS', games: 'GAMES' };

/**
 * IYS MOBILE — an original 2005–07 mobile-internet shell (status bar, path
 * title, soft keys) over the same routes, catalogue, bag and favorites as the
 * desktop. Big touch targets, no fake cursor, no windows.
 */
export default function MobileShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const cat = useCatalogue();
  const bag = useCart((s) => itemCount(s.items));
  const center = useCenterKey((s) => s.action);
  const notice = useOS((s) => s.notice);
  const markBoot = useSession((s) => s.markBoot);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [game, setGame] = useState<GameId | null>(null);
  const [splash, setSplash] = useState(() => !useSession.getState().bootSeen && location.pathname === '/');
  const unread = usePjoysUnread();
  const [toast, setToast] = useState<string | null>(null);
  const content = useRef<HTMLElement>(null);

  // The escape route listens for repeated presses that change nothing (src/lib/rageClicks.ts).
  useEffect(() => watchRageClicks(), []);
  useEffect(() => {
    if (!splash) return;
    const t = window.setTimeout(() => {
      markBoot();
      setSplash(false);
    }, 1100);
    return () => window.clearTimeout(t);
  }, [splash, markBoot]);

  // New route → close any overlay, back to top.
  useLayoutEffect(() => {
    setOverlay(null);
    setGame(null);
    content.current?.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  // PJOYS texts once per session: a small marker on the bar's envelope, never a banner over the shop.
  useEffect(() => {
    if (!FEATURES.mobilePjoysNotice || splash || useSession.getState().pjoysPinged) return;
    const t = window.setTimeout(() => {
      useSession.getState().markPjoys();
      play('ping');
    }, 6000);
    return () => window.clearTimeout(t);
  }, [splash]);

  useEffect(() => {
    if (!notice) return;
    setToast(notice.text);
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [notice]);

  const open = (o: Overlay) => {
    if (o === 'chat') useSession.getState().markPjoysRead();
    setGame(null);
    setOverlay(o);
    content.current?.scrollTo(0, 0);
  };
  /** The ONE way MENU and MY BAG open (top keys and soft keys alike): same overlay, same state, second press closes. */
  const toggle = (o: 'menu' | 'bag') => {
    play('click');
    if (overlay === o) setOverlay(null);
    else open(o);
  };
  const path = location.pathname;
  const home = path === '/' && !overlay;
  let title = 'IYS MOBILE';
  if (overlay === 'games' && game) title = `IYS MOBILE › GAMES › ${gameMeta(game)?.title ?? ''}`;
  else if (overlay) title = `IYS MOBILE › ${OVERLAY_TITLES[overlay]}`;
  else if (path === '/shop') title = 'IYS MOBILE › SHOP';
  else if (path.startsWith('/collections/')) {
    const h = path.split('/')[2]!;
    title = `IYS MOBILE › ${collectionTitle(h, cat?.collections.get(h)?.title).toUpperCase()}`;
  } else if (path.startsWith('/product')) title = 'IYS MOBILE › GALLERY';
  else if (path === '/search') title = 'IYS MOBILE › SEARCH';
  else if (path === '/favorites') title = 'IYS MOBILE › FAVORITES';
  else if (path === '/stores') title = 'IYS MOBILE › STORES';

  // A bar key always lands on its screen: closes any overlay first; same screen → back to its top.
  const goKey = (to: string) => {
    play('click');
    setOverlay(null);
    setGame(null);
    if (path === to && !overlay) content.current?.scrollTo(0, 0);
    else navigate(to);
  };
  let current: BarKey | null = null;
  if (overlay === 'chat') current = 'msg';
  else if (!overlay) current = path === '/shop' ? 'shop' : path === '/search' ? 'search' : path === '/favorites' ? 'favs' : path === '/stores' ? 'stores' : null;

  const back = () => {
    play('click');
    if (overlay === 'games' && game) return setGame(null);
    if (overlay) return setOverlay(null);
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate('/');
  };

  if (splash)
    return (
      <div
        className="m-splash"
        role="status"
        onClick={() => {
          markBoot();
          setSplash(false);
        }}
      >
        <div className="m-splash__panel">
          <img src={brand.wordmark} alt="In Your Shoe" />
          <p>IYS MOBILE</p>
          <p className="m-splash__sub">{concept.boot.connecting}</p>
          <div className="progress" style={{ width: 180 }}>
            <div className="progress__bar progress__bar--indeterminate" />
          </div>
        </div>
        <button type="button" className="btn btn--sky m-splash__skip">
          {concept.y2k.enter}
        </button>
      </div>
    );

  return (
    <div className="m-shell">
      <a className="skip-link" href="#m-main">
        Skip to content
      </a>
      <header className="m-head">
        <StatusBar />
        <div className={`m-realbar${FEATURES.topNav ? ' m-realbar--nav' : ''}`}>
          {FEATURES.topNav && (
            <button type="button" className="m-topkey m-topkey--menu" aria-label="IYS MENU" aria-expanded={overlay === 'menu'} onClick={() => toggle('menu')}>
              <img className="m-topkey__mark" src={brand.markWhite} alt="" width={20} height={10} />
              <span>MENU</span>
            </button>
          )}
          <RealSwitch />
          {FEATURES.topNav && (
            <button
              type="button"
              className="m-topkey m-topkey--bag"
              aria-expanded={overlay === 'bag'}
              aria-label={bag ? `MY BAG: ${bag} ${bag === 1 ? 'item' : 'items'}` : 'MY BAG: empty'}
              onClick={() => toggle('bag')}
            >
              <Icon name="bag" size={14} />
              <span className="m-topkey__my">MY</span>
              <span>BAG</span>
              {bag > 0 && (
                <span className="m-topkey__badge" aria-hidden="true">
                  {bag > 99 ? '99+' : bag}
                </span>
              )}
            </button>
          )}
        </div>
        <MBar
          title={title}
          current={current}
          counts={{ shop: cat?.products.length, stores: storesData.storeCount }}
          unread={unread}
          onKey={goKey}
          onMessages={() => {
            play('click');
            open('chat');
          }}
        />
      </header>
      {toast && (
        <p className="m-toast" role="status">
          {toast}
        </p>
      )}
      <main className="m-content" id="m-main" ref={content} tabIndex={-1}>
        {overlay === 'bag' && <MBag close={() => setOverlay(null)} />}
        {overlay === 'camera' && <MCamera />}
        {overlay === 'chat' && <MChat close={() => setOverlay(null)} />}
        {overlay === 'menu' && <MMenu close={() => setOverlay(null)} openOverlay={open} />}
        {overlay === 'filters' && <MFilters close={() => setOverlay(null)} />}
        {overlay === 'games' && <MGames game={game} setGame={setGame} close={() => setOverlay(null)} />}
        <div className="m-routes" hidden={Boolean(overlay)}>
          <Routes>
            <Route path="/" element={<MHome open={open} active={!overlay} />} />
            <Route path="/shop" element={<MList open={open} />} />
            <Route path="/collections/:handle" element={<MList open={open} />} />
            <Route path="/search" element={<MSearch />} />
            <Route path="/product/:handle" element={<MProduct />} />
            <Route path="/products/:handle" element={<MProduct />} />
            <Route path="/favorites" element={<MFavorites />} />
            <Route path="/stores" element={<MStores />} />
            <Route path="*" element={<MNotFound />} />
          </Routes>
        </div>
      </main>
      <nav className="m-soft" aria-label="Soft keys">
        {home ? (
          <button type="button" className="m-soft__key" onClick={() => toggle('menu')}>
            MENU
          </button>
        ) : (
          <button type="button" className="m-soft__key" onClick={back}>
            ◀ BACK
          </button>
        )}
        <button
          type="button"
          className="m-soft__center"
          disabled={center?.disabled}
          onClick={() => {
            play('click');
            if (center) center.run();
            else navigate('/');
          }}
        >
          {center?.label ?? 'HOME'}
        </button>
        <button type="button" className="m-soft__key m-soft__key--right" onClick={() => toggle('bag')} aria-label={`My Bag, ${bag} items`}>
          BAG{bag ? ` (${bag})` : ''}
        </button>
      </nav>
      <TransferDialog />
      <Dialogs />
      <CRT boot={false} />
    </div>
  );
}
