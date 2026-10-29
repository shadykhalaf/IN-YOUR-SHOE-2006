import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { brand, localImage } from '../data/assets';
import { concept } from '../data/copy';
import { useCatalogue } from '../lib/catalogue/load';
import { formatCount } from '../lib/catalogue/format';
import { play } from '../lib/sound';
import { Boot } from '../components/os/Boot';
import { DesktopIcons, Wallpaper } from '../components/os/Desktop';
import { Dialogs } from '../components/os/Dialogs';
import { RealSwitch } from '../components/os/RealSwitch';
import { Balloon, CRT, TransferDialog } from '../components/os/Overlays';
import { Screensaver } from '../components/os/Screensaver';
import { StartMenu } from '../components/os/StartMenu';
import { Taskbar, useOnline } from '../components/os/Taskbar';
import { TopBagButton, TopHomeButton, TopMenuButton } from '../components/os/TopNav';
import { FEATURES } from '../config/features';
import { Window } from '../components/os/Window';
import { Busy } from '../components/shop/Busy';
import { APP_ICONS } from '../components/os/Taskbar';
import { watchRageClicks } from '../lib/frustration';
import { useOS, type AppId, type Win } from '../state/os';
import { usePjoysUnread, useSession } from '../state/preferences';
import { openChat } from '../apps/Messenger/nav';
import { useCatchyEnabled } from '../features/catchy/storage';
import '../styles/os.css';
import '../styles/apps.css';

type AppProps = { win: Win };
const LOADERS: Record<AppId, () => Promise<{ default: ComponentType<AppProps> }>> = {
  internet: () => import('../apps/Browser/Browser'),
  messenger: () => import('../apps/Messenger/Messenger'),
  wardrobe: () => import('../apps/Wardrobe/Wardrobe'),
  camera: () => import('../apps/Camera/Camera'),
  viewer: () => import('../apps/Viewer/ImageViewer'),
  bag: () => import('../apps/Bag/Bag'),
  control: () => import('../apps/ControlPanel/ControlPanel'),
  mail: () => import('../apps/Small/Mail'),
  readme: () => import('../apps/Small/Readme'),
  recycle: () => import('../apps/Small/RecycleBin'),
  newsletter: () => import('../apps/Small/Newsletter'),
  help: () => import('../apps/Small/Help'),
  exchange: () => import('../apps/Small/Exchange'),
  essentials: () => import('../apps/Small/Essentials'),
  games: () => import('../apps/Games/GamesFolder'),
  game: () => import('../apps/Games/GameWindow'),
  sizeguide: () => import('../apps/SizeGuide/SizeGuide'),
};
const CatchyPet = lazy(() => import('../features/catchy/CatchyPet'));
const APPS = Object.fromEntries(Object.entries(LOADERS).map(([k, load]) => [k, lazy(load)])) as unknown as Record<AppId, ComponentType<AppProps>>;

/** Warm every app chunk once the desktop is idle, so windows open without a loading frame. */
function preloadApps() {
  const run = () => Object.values(LOADERS).forEach((load) => void load());
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 1500);
}

function Loading({ win }: AppProps) {
  return (
    <Window win={win} icon={APP_ICONS[win.app]}>
      <Busy label={`Loading ${win.title}...`} from="computer" to={APP_ICONS[win.app]} />
    </Window>
  );
}

function AppWindow({ win }: AppProps) {
  const App = APPS[win.app];
  return (
    <Suspense fallback={<Loading win={win} />}>
      <App win={win} />
    </Suspense>
  );
}

export default function DesktopShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const windows = useOS((s) => s.windows);
  const { setDesk, open, showDialog, showBalloon, setStart } = useOS.getState();
  const session = useSession();
  const deepLink = location.pathname !== '/';
  const [booting, setBooting] = useState(() => !session.bootSeen && !deepLink && !new URLSearchParams(location.search).has('noboot'));
  const pjoysUnread = usePjoysUnread();
  const deskRef = useRef<HTMLDivElement>(null);
  const cat = useCatalogue();
  const online = useOnline();
  const catchy = useCatchyEnabled();

  // Desktop geometry (windows are clamped inside it).
  useLayoutEffect(() => {
    const el = deskRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setDesk(el.clientWidth, el.clientHeight));
    ro.observe(el);
    setDesk(el.clientWidth, el.clientHeight);
    return () => ro.disconnect();
  }, [setDesk]);

  // First paint after boot: welcome dialog on "/", browser straight away on deep links.
  const started = useRef(false);
  // The escape route listens for repeated presses that change nothing (src/lib/rageClicks.ts).
  useEffect(() => watchRageClicks(), []);
  useEffect(() => {
    if (booting || started.current) return;
    started.current = true;
    preloadApps();
    if (deepLink || useSession.getState().welcomeSeen) open('internet');
    else showDialog({ kind: 'welcome' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booting]);

  // Real back/forward to a page while the browser is closed → reopen it.
  const hasBrowser = windows.some((w) => w.id === 'internet');
  useEffect(() => {
    if (!booting && started.current && location.pathname !== '/' && !useOS.getState().windows.some((w) => w.id === 'internet')) open('internet');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);
  // Closing the browser returns the address to "/".
  const hadBrowser = useRef(false);
  useEffect(() => {
    if (hadBrowser.current && !hasBrowser && location.pathname !== '/') navigate('/');
    hadBrowser.current = hasBrowser;
  }, [hasBrowser, location.pathname, navigate]);

  // 2:13 AM — PJOYS comes online once per session, a few seconds after browsing starts.
  useEffect(() => {
    if (booting || !hasBrowser || useSession.getState().pjoysPinged) return;
    const t = window.setTimeout(() => {
      useSession.getState().markPjoys();
      play('ping');
      showBalloon({ id: 'pjoys', title: 'PJOYS is online', text: `“${concept.messenger.pjoysOpener}”`, props: { photo: localImage('cereal-killer-pjoys', 1)?.src ?? localImage('cereal-killer-pjoys')?.src } });
    }, 9000);
    return () => window.clearTimeout(t);
  }, [booting, hasBrowser, showBalloon]);

  const openPjoys = () => {
    showBalloon(null);
    openChat('pjoys', 'PJOYS');
  };

  return (
    <>
      <a className="skip-link" href="#iys-main" onClick={() => open('internet')}>
        Skip to IYS Internet
      </a>
      <header className={`realbar${FEATURES.topNav ? ' realbar--nav' : ''}`}>
        {FEATURES.topNav && (
          <div className="realbar__side">
            <TopMenuButton />
            <TopHomeButton />
          </div>
        )}
        <RealSwitch />
        {FEATURES.topNav && (
          <div className="realbar__side realbar__side--end">
            <TopBagButton />
          </div>
        )}
      </header>
      <main className="desktop" ref={deskRef} aria-label="IYS OS desktop" onMouseDown={() => setStart(false)}>
        <h1 className="sr-only">IYS INTERNET 2006 - In Your Shoe desktop</h1>
        <Wallpaper />
        <DesktopIcons />
        {catchy && !booting && (
          <Suspense fallback={null}>
            <CatchyPet mode="desktop" />
          </Suspense>
        )}
        <div className="desktop__stamp">
          <img src={brand.markWhite} alt="" width={46} height={46} style={{ marginLeft: 'auto', width: 46, height: 'auto', opacity: 0.95 }} />
          <strong>{concept.name}</strong>
          <br />
          {cat ? `${formatCount(cat.products.length)} real products · snapshot ${cat.generatedAt.slice(0, 10)}` : 'Loading catalogue...'}
          <br />
          IN YOUR SHOE — 2006 · built with Omar Akram
        </div>
        <div className="win-layer">
          {windows.map((w) => (
            <AppWindow key={w.id} win={w} />
          ))}
        </div>
      </main>
      <Taskbar onStart={() => setStart(!useOS.getState().startOpen)} pjoysUnread={pjoysUnread} onMessenger={pjoysUnread ? openPjoys : () => open('messenger')} />
      <StartMenu />
      <Balloon onOpen={openPjoys} />
      <TransferDialog />
      <Dialogs />
      {!online && (
        <p className="offline" role="alert">
          INTERNET CONNECTION LOST - product photos load from the official IYS CDN. Prices shown are the saved snapshot.
        </p>
      )}
      <Screensaver disabled={booting} />
      {booting && (
        <Boot
          onDone={() => {
            session.markBoot();
            setBooting(false);
          }}
        />
      )}
      <CRT boot={booting} />
    </>
  );
}
